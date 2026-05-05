import { Prisma } from '@prisma/client';
import { generatePracticeWithAi } from '../../ai/ai-client';
import { prisma } from '../../lib/prisma';
import { memoryPracticeStore } from './memory-store';
import { masteryFromAccuracy, practiceSessionCreateSchema, practiceSubmitSchema, type MasteryStatus, type PracticeQuestionRecord, type PracticeSessionCreateInput, type PracticeSessionRecord, type PracticeSubmitInput } from './schema';

function shouldUseMemoryStore() {
  return !process.env.DATABASE_URL || process.env.CHILDREN_STORE === 'memory';
}

async function withFallback<T>(operation: () => Promise<T>, fallback: () => T): Promise<T> {
  if (shouldUseMemoryStore()) return fallback();
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
      console.warn('[practice] Prisma unavailable, falling back to memory store:', error.message);
      return fallback();
    }
    throw error;
  }
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function validateCompleteAnswers(questionIds: string[], input: PracticeSubmitInput) {
  const expected = new Set(questionIds);
  const seen = new Set<string>();
  for (const answer of input.answers) {
    if (!expected.has(answer.questionId)) throw new Error('提交包含不属于本次练习的题目');
    if (seen.has(answer.questionId)) throw new Error('提交包含重复题目答案');
    if (!answer.userAnswer.trim()) throw new Error('请完成所有题目后再提交');
    seen.add(answer.questionId);
  }
  if (seen.size !== expected.size) throw new Error('请完成所有题目后再提交');
}

function masteryScore(status: MasteryStatus, accuracy: number) {
  if (status === 'MASTERED') return Math.max(80, accuracy);
  if (status === 'PRACTICING') return Math.min(79, Math.max(50, accuracy));
  return Math.min(49, accuracy);
}

function optionsFromJson(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function questionToRecord(question: {
  id: string; practiceSessionId: string; order: number; questionText: string; options: Prisma.JsonValue | null; answerText: string | null; analysis: string | null; knowledgePointText: string | null; userAnswer: string | null; isCorrect: boolean | null;
}): PracticeQuestionRecord {
  return {
    id: question.id,
    sessionId: question.practiceSessionId,
    order: question.order,
    stem: question.questionText,
    options: optionsFromJson(question.options),
    answerText: question.answerText ?? '',
    analysis: question.analysis ?? '',
    knowledgePoint: question.knowledgePointText ?? '',
    userAnswer: question.userAnswer,
    isCorrect: question.isCorrect,
  };
}

function sessionToRecord(session: {
  id: string; childId: string; title: string; status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'; knowledgePointText: string | null; questionCount: number; difficulty: string | null; questionType: string | null; startedAt: Date; endedAt: Date | null; correctCount: number | null; accuracy: number | null; masteryBefore: string | null; masteryAfter: string | null; questions: Parameters<typeof questionToRecord>[0][];
}): PracticeSessionRecord {
  const totalCount = session.questions.length || session.questionCount;
  return {
    id: session.id,
    childId: session.childId,
    title: session.title,
    status: session.status,
    knowledgePoint: session.knowledgePointText ?? '',
    questionCount: session.questionCount,
    difficulty: session.difficulty === 'HARD' ? 'HARD' : session.difficulty === 'EASY' ? 'EASY' : 'MEDIUM',
    questionType: session.questionType === 'FILL_BLANK' ? 'FILL_BLANK' : session.questionType === 'JUDGEMENT' ? 'JUDGEMENT' : 'CHOICE',
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    result: session.status === 'COMPLETED' ? {
      correctCount: session.correctCount ?? 0,
      totalCount,
      accuracy: session.accuracy ?? 0,
      masteryBefore: (session.masteryBefore ?? 'WEAK') as MasteryStatus,
      masteryAfter: (session.masteryAfter ?? 'WEAK') as MasteryStatus,
    } : null,
    questions: session.questions.map(questionToRecord).sort((a, b) => a.order - b.order),
  };
}

async function getDbMastery(childId: string, knowledgePoint: string): Promise<MasteryStatus> {
  const state = await prisma.childKnowledgePoint.findFirst({
    where: {
      childId,
      OR: [
        { knowledgePointText: knowledgePoint },
        { knowledgePoint: { name: knowledgePoint } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });
  if (!state) return 'WEAK';
  if (state.masteryScore >= 80) return 'MASTERED';
  if (state.masteryScore >= 50) return 'PRACTICING';
  return 'WEAK';
}

export const practiceService = {
  async createSession(rawInput: PracticeSessionCreateInput): Promise<PracticeSessionRecord> {
    const input = practiceSessionCreateSchema.parse(rawInput);
    const aiResult = await generatePracticeWithAi(input);
    const questions = aiResult.questions;
    return withFallback(async () => {
      const session = await prisma.practiceSession.create({
        data: {
          childId: input.childId,
          title: `${input.knowledgePoint} · ${input.questionCount}题练习`,
          knowledgePointText: input.knowledgePoint,
          questionCount: input.questionCount,
          difficulty: input.difficulty,
          questionType: input.questionType,
          masteryBefore: await getDbMastery(input.childId, input.knowledgePoint),
          questions: {
            create: questions.map((question, index) => ({
              order: index + 1,
              questionText: question.stem,
              options: question.options,
              answerText: question.answerText,
              analysis: question.analysis,
              knowledgePointText: question.knowledgePoint,
            })),
          },
        },
        include: { questions: true },
      });
      return sessionToRecord(session);
    }, () => memoryPracticeStore.create(input, questions));
  },

  async getSession(sessionId: string): Promise<PracticeSessionRecord | null> {
    return withFallback(async () => {
      const session = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { questions: true } });
      return session ? sessionToRecord(session) : null;
    }, () => memoryPracticeStore.get(sessionId));
  },

  async submitSession(sessionId: string, rawInput: PracticeSubmitInput): Promise<PracticeSessionRecord> {
    const input = practiceSubmitSchema.parse(rawInput);
    return withFallback(async () => {
      const existing = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { questions: true } });
      if (!existing) throw new Error('练习不存在');
      validateCompleteAnswers(existing.questions.map((question) => question.id), input);
      const answerMap = new Map(input.answers.map((item) => [item.questionId, item.userAnswer]));
      let correctCount = 0;
      const questionUpdates = existing.questions.map((question) => {
        const userAnswer = answerMap.get(question.id) ?? '';
        const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(question.answerText ?? '');
        if (isCorrect) correctCount += 1;
        return { id: question.id, userAnswer, isCorrect };
      });
      const totalCount = existing.questions.length;
      const accuracy = Math.round((correctCount / totalCount) * 100);
      const knowledgePoint = existing.knowledgePointText ?? '';
      const masteryBefore = (existing.masteryBefore ?? await getDbMastery(existing.childId, knowledgePoint)) as MasteryStatus;
      const masteryAfter = masteryFromAccuracy(totalCount, accuracy);
      const updated = await prisma.$transaction(async (tx) => {
        await Promise.all(questionUpdates.map((question) => tx.practiceQuestion.update({
          where: { id: question.id },
          data: { userAnswer: question.userAnswer, isCorrect: question.isCorrect },
        })));
        if (knowledgePoint) {
          await tx.childKnowledgePoint.upsert({
            where: { childId_knowledgePointText: { childId: existing.childId, knowledgePointText: knowledgePoint } },
            create: {
              childId: existing.childId,
              knowledgePointText: knowledgePoint,
              masteryScore: masteryScore(masteryAfter, accuracy),
              lastPracticedAt: new Date(),
            },
            update: {
              masteryScore: masteryScore(masteryAfter, accuracy),
              lastPracticedAt: new Date(),
            },
          });
        }
        return tx.practiceSession.update({
          where: { id: sessionId },
          data: { status: 'COMPLETED', endedAt: new Date(), correctCount, accuracy, masteryBefore, masteryAfter },
          include: { questions: true },
        });
      });
      return sessionToRecord(updated);
    }, () => memoryPracticeStore.submit(sessionId, input));
  },
};

export function resetPracticeStoreForTest() {
  memoryPracticeStore.reset();
}
