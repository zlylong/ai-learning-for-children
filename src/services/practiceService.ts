import { Prisma } from '@prisma/client';
import { aiClient } from '../ai/ai-client';
import { generatePracticeQuestionsPrompt } from '../ai/prompts/generatePracticeQuestionsPrompt';
import { childService } from '../features/children/service';
import { masteryFromAccuracy, practiceSessionCreateSchema, type MasteryStatus, type PracticeQuestionRecord, type PracticeSessionCreateInput, type PracticeSessionRecord } from '../features/practice/schema';
import { prisma } from '../lib/prisma';
import { generatedPracticeQuestionsSchema, type GeneratedPracticeQuestion } from '../schemas/generatedPracticeQuestionsSchema';

const DEMO_USER_ID = 'demo-user';

const demoKnowledgePoints: Record<string, string> = {
  'kp-carry-addition': '两位数加法进位',
  'kp-reading-summary': '阅读理解-内容概括',
  'kp-multiplication': '乘法口诀应用',
  'kp-word-problem': '应用题数量关系',
  'kp-perimeter': '图形周长计算',
};

function shouldUseMemoryStore() {
  return !process.env.DATABASE_URL || process.env.CHILDREN_STORE === 'memory';
}

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function normalizeAnswer(value: string) { return value.trim().replace(/\s+/g, '').toLowerCase(); }

function toAccuracyRatio(correctCount: number, totalCount: number) {
  return Number((correctCount / totalCount).toFixed(4));
}

function masteryScore(status: MasteryStatus, accuracyPercent: number) {
  if (status === 'MASTERED') return Math.max(80, accuracyPercent);
  if (status === 'PRACTICING') return Math.min(79, Math.max(50, accuracyPercent));
  return Math.min(49, accuracyPercent);
}

type MemoryMastery = {
  childId: string;
  knowledgePointId: string;
  knowledgePointText: string;
  status: MasteryStatus;
  practiceCount: number;
  correctCount: number;
  wrongCount: number;
  lastPracticedAt: string | null;
};

type MemoryState = {
  sessions: Map<string, PracticeSessionRecord>;
  mastery: Map<string, MemoryMastery>;
};

const globalForPracticeService = globalThis as typeof globalThis & { __aiLearningPracticeService?: MemoryState };

function memoryState(): MemoryState {
  globalForPracticeService.__aiLearningPracticeService ??= { sessions: new Map(), mastery: new Map() };
  return globalForPracticeService.__aiLearningPracticeService;
}

function resetMemoryState() {
  globalForPracticeService.__aiLearningPracticeService = { sessions: new Map(), mastery: new Map() };
}

async function assertChildOwnedByCurrentUser(childId: string) {
  if (shouldUseMemoryStore()) {
    const child = await childService.get(childId);
    if (!child) throw new Error('孩子档案不存在或无权访问');
    return;
  }
  const child = await prisma.child.findFirst({ where: { id: childId, userId: DEMO_USER_ID }, select: { id: true } });
  if (!child) throw new Error('孩子档案不存在或无权访问');
}

async function assertSessionOwnedByCurrentUser(childId: string) {
  await assertChildOwnedByCurrentUser(childId);
}

async function getMasteryBefore(childId: string, knowledgePointId: string | null, knowledgePointText: string): Promise<MasteryStatus> {
  if (shouldUseMemoryStore()) {
    const key = `${childId}:${knowledgePointId ?? knowledgePointText}`;
    return memoryState().mastery.get(key)?.status ?? 'WEAK';
  }
  const existing = knowledgePointId
    ? await prisma.childKnowledgePoint.findUnique({ where: { childId_knowledgePointId: { childId, knowledgePointId } }, select: { status: true } })
    : await prisma.childKnowledgePoint.findUnique({ where: { childId_knowledgePointText: { childId, knowledgePointText } }, select: { status: true } });
  return (existing?.status ?? 'WEAK') as MasteryStatus;
}

async function resolveKnowledgePoint(input: PracticeSessionCreateInput): Promise<{ id: string | null; title: string }> {
  if (shouldUseMemoryStore()) {
    const key = input.knowledgePointId ?? input.knowledgePoint ?? '';
    return { id: input.knowledgePointId ?? null, title: demoKnowledgePoints[key] ?? input.knowledgePoint ?? key };
  }

  if (input.knowledgePointId) {
    const knowledgePoint = await prisma.knowledgePoint.findUnique({ where: { id: input.knowledgePointId } });
    if (!knowledgePoint) throw new Error('知识点不存在');
    return { id: knowledgePoint.id, title: knowledgePoint.name };
  }
  return { id: null, title: input.knowledgePoint ?? '' };
}

async function generateQuestions(input: PracticeSessionCreateInput, knowledgePointTitle: string): Promise<GeneratedPracticeQuestion[]> {
  const prompt = generatePracticeQuestionsPrompt({
    knowledgePointTitle,
    questionCount: input.questionCount,
    difficulty: input.difficulty,
    questionType: input.questionType,
  });
  const raw = await aiClient.generateJson({
    prompt,
    knowledgePointTitle,
    questionCount: input.questionCount,
    difficulty: input.difficulty,
    questionType: input.questionType,
  });
  const parsed = generatedPracticeQuestionsSchema.safeParse(raw);
  if (!parsed.success) throw new Error('AI 练习题生成结果校验失败');
  if (parsed.data.questions.length !== input.questionCount) throw new Error('AI 练习题数量不匹配');
  const mismatched = parsed.data.questions.find((question) => question.questionType !== input.questionType || question.difficulty !== input.difficulty);
  if (mismatched) throw new Error('AI 练习题类型或难度不匹配');
  return parsed.data.questions;
}

function hideAnswers(session: PracticeSessionRecord): PracticeSessionRecord {
  if (session.status === 'COMPLETED') return structuredClone(session);
  return {
    ...structuredClone(session),
    questions: session.questions.map((question) => {
      const safeQuestion = { ...question } as Partial<PracticeQuestionRecord>;
      delete safeQuestion.answer;
      delete safeQuestion.answerText;
      delete safeQuestion.explanation;
      delete safeQuestion.analysis;
      return safeQuestion as PracticeQuestionRecord;
    }),
  };
}

function validateCompleteAnswers(questionIds: string[], answers: Record<string, string>) {
  const expected = new Set(questionIds);
  const submitted = Object.keys(answers);
  const seen = new Set<string>();
  for (const questionId of submitted) {
    if (!expected.has(questionId)) throw new Error('提交包含不属于本次练习的题目');
    if (seen.has(questionId)) throw new Error('提交包含重复题目答案');
    if (!answers[questionId]?.trim()) throw new Error('请完成所有题目后再提交');
    seen.add(questionId);
  }
  if (seen.size !== expected.size) throw new Error('请完成所有题目后再提交');
}

function updateMemoryMastery(childId: string, knowledgePointId: string, knowledgePointText: string, totalCount: number, correctCount: number, status: MasteryStatus) {
  const state = memoryState();
  const key = `${childId}:${knowledgePointId || knowledgePointText}`;
  const existing = state.mastery.get(key) ?? {
    childId,
    knowledgePointId,
    knowledgePointText,
    status: 'WEAK' as MasteryStatus,
    practiceCount: 0,
    correctCount: 0,
    wrongCount: 0,
    lastPracticedAt: null,
  };
  const wrongCount = totalCount - correctCount;
  existing.status = status;
  existing.practiceCount += totalCount;
  existing.correctCount += correctCount;
  existing.wrongCount += wrongCount;
  existing.lastPracticedAt = now();
  state.mastery.set(key, existing);
}

function sessionFromDb(session: {
  id: string;
  childId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  title: string;
  knowledgePointText: string | null;
  questionCount: number;
  difficulty: string | null;
  questionType: string | null;
  startedAt: Date;
  endedAt: Date | null;
  correctCount: number | null;
  accuracy: number | null;
  masteryBefore: string | null;
  masteryAfter: string | null;
  questions: Array<{
    id: string;
    practiceSessionId: string;
    knowledgePointId: string | null;
    knowledgePointText: string | null;
    order: number;
    questionText: string;
    questionType: string;
    options: Prisma.JsonValue | null;
    answer: string;
    explanation: string | null;
    answerText: string | null;
    analysis: string | null;
    userAnswer: string | null;
    isCorrect: boolean | null;
  }>;
}): PracticeSessionRecord {
  const totalCount = session.questions.length || session.questionCount;
  const accuracy = session.accuracy ?? 0;
  return {
    id: session.id,
    childId: session.childId,
    title: session.title,
    status: session.status,
    knowledgePoint: session.knowledgePointText ?? '',
    questionCount: session.questionCount,
    difficulty: session.difficulty === 'hard' ? 'hard' : session.difficulty === 'easy' ? 'easy' : 'medium',
    questionType: session.questionType === 'fill_blank' ? 'fill_blank' : session.questionType === 'short_answer' ? 'short_answer' : 'single_choice',
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    result: session.status === 'COMPLETED' ? {
      correctCount: session.correctCount ?? 0,
      totalCount,
      accuracy,
      masteryBefore: (session.masteryBefore ?? 'WEAK') as MasteryStatus,
      masteryAfter: (session.masteryAfter ?? 'WEAK') as MasteryStatus,
    } : null,
    questions: session.questions.map((question): PracticeQuestionRecord => ({
      id: question.id,
      sessionId: question.practiceSessionId,
      order: question.order,
      stem: question.questionText,
      questionText: question.questionText,
      questionType: question.questionType === 'fill_blank' ? 'fill_blank' : question.questionType === 'short_answer' ? 'short_answer' : 'single_choice',
      options: Array.isArray(question.options) ? question.options.filter((item): item is string => typeof item === 'string') : [],
      answerText: question.answer || question.answerText || '',
      answer: question.answer || question.answerText || '',
      analysis: question.explanation || question.analysis || '',
      explanation: question.explanation || question.analysis || '',
      knowledgePoint: question.knowledgePointText ?? session.knowledgePointText ?? '',
      knowledgePointId: question.knowledgePointId,
      userAnswer: question.userAnswer,
      isCorrect: question.isCorrect,
    })).sort((a, b) => a.order - b.order),
  };
}

export const practiceService = {
  async createPracticeSession(rawInput: PracticeSessionCreateInput): Promise<{ sessionId: string; session: PracticeSessionRecord }> {
    const input = practiceSessionCreateSchema.parse(rawInput);
    await assertChildOwnedByCurrentUser(input.childId);
    const knowledgePoint = await resolveKnowledgePoint(input);
    const questions = await generateQuestions(input, knowledgePoint.title);
    const masteryBefore = await getMasteryBefore(input.childId, knowledgePoint.id, knowledgePoint.title);

    if (shouldUseMemoryStore()) {
      const sessionId = id('practice');
      const session: PracticeSessionRecord = {
        id: sessionId,
        childId: input.childId,
        title: `${knowledgePoint.title} · ${input.questionCount}题练习`,
        status: 'ACTIVE',
        knowledgePoint: knowledgePoint.title,
        questionCount: input.questionCount,
        difficulty: input.difficulty,
        questionType: input.questionType,
        startedAt: now(),
        endedAt: null,
        result: null,
        questions: questions.map((question, index) => ({
          id: id(`pq${index + 1}`),
          sessionId,
          order: index + 1,
          stem: question.questionText,
          questionText: question.questionText,
          questionType: question.questionType,
          options: question.options,
          answerText: question.answer,
          answer: question.answer,
          analysis: question.explanation,
          explanation: question.explanation,
          knowledgePoint: question.knowledgePointTitle,
          knowledgePointId: knowledgePoint.id,
          userAnswer: null,
          isCorrect: null,
        })),
      };
      memoryState().sessions.set(sessionId, session);
      return { sessionId, session: hideAnswers(session) };
    }

    const session = await prisma.practiceSession.create({
      data: {
        childId: input.childId,
        type: 'KNOWLEDGE_POINT',
        title: `${knowledgePoint.title} · ${input.questionCount}题练习`,
        knowledgePointText: knowledgePoint.title,
        questionCount: input.questionCount,
        difficulty: input.difficulty,
        questionType: input.questionType,
        masteryBefore,
        questions: {
          create: questions.map((question, index) => ({
            sessionId: '',
            order: index + 1,
            knowledgePointId: knowledgePoint.id,
            knowledgePointText: question.knowledgePointTitle,
            questionText: question.questionText,
            questionType: question.questionType,
            options: question.options,
            answer: question.answer,
            answerText: question.answer,
            explanation: question.explanation,
            analysis: question.explanation,
          })),
        },
      },
      include: { questions: true },
    });
    return { sessionId: session.id, session: hideAnswers(sessionFromDb(session)) };
  },

  async getPracticeSession(sessionId: string): Promise<PracticeSessionRecord | null> {
    if (shouldUseMemoryStore()) {
      const session = memoryState().sessions.get(sessionId);
      if (session) await assertSessionOwnedByCurrentUser(session.childId);
      return session ? hideAnswers(session) : null;
    }
    const session = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { questions: true } });
    if (session) await assertSessionOwnedByCurrentUser(session.childId);
    return session ? hideAnswers(sessionFromDb(session)) : null;
  },

  async getPracticeSessionForResult(sessionId: string): Promise<PracticeSessionRecord | null> {
    if (shouldUseMemoryStore()) {
      const session = memoryState().sessions.get(sessionId);
      if (session) await assertSessionOwnedByCurrentUser(session.childId);
      return session ? structuredClone(session) : null;
    }
    const session = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { questions: true } });
    if (session) await assertSessionOwnedByCurrentUser(session.childId);
    return session ? sessionFromDb(session) : null;
  },

  async submitPracticeSession(sessionId: string, rawInput: { answers: Record<string, string> }) {
    const input = { answers: rawInput.answers };
    if (shouldUseMemoryStore()) {
      const session = memoryState().sessions.get(sessionId);
      if (!session) throw new Error('练习不存在');
      await assertSessionOwnedByCurrentUser(session.childId);
      if (session.status !== 'ACTIVE') throw new Error('练习已提交，不能重复提交');
      validateCompleteAnswers(session.questions.map((question) => question.id), input.answers);
      let correctCount = 0;
      session.questions = session.questions.map((question) => {
        const userAnswer = input.answers[question.id];
        const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(question.answerText);
        if (isCorrect) correctCount += 1;
        return { ...question, userAnswer, isCorrect };
      });
      const totalCount = session.questions.length;
      const accuracyPercent = Math.round((correctCount / totalCount) * 100);
      const masteryAfter = masteryFromAccuracy(totalCount, accuracyPercent);
      const masteryKey = session.questions[0]?.knowledgePointId ?? session.knowledgePoint;
      const before = memoryState().mastery.get(`${session.childId}:${masteryKey}`)?.status ?? 'WEAK';
      session.status = 'COMPLETED';
      session.endedAt = now();
      session.result = { correctCount, totalCount, accuracy: accuracyPercent, masteryBefore: before, masteryAfter };
      updateMemoryMastery(session.childId, masteryKey, session.knowledgePoint, totalCount, correctCount, masteryAfter);
      memoryState().sessions.set(session.id, session);
      return {
        session: structuredClone(session),
        correctCount,
        totalCount,
        correctRate: toAccuracyRatio(correctCount, totalCount),
        masteryStatus: masteryAfter,
        results: session.questions.map((question) => ({ questionId: question.id, userAnswer: question.userAnswer, isCorrect: question.isCorrect, answer: question.answerText, explanation: question.analysis })),
      };
    }

    const existing = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { questions: true } });
    if (!existing) throw new Error('练习不存在');
    await assertSessionOwnedByCurrentUser(existing.childId);
    if (existing.status !== 'ACTIVE') throw new Error('练习已提交，不能重复提交');
    validateCompleteAnswers(existing.questions.map((question) => question.id), input.answers);
    let correctCount = 0;
    const questionUpdates = existing.questions.map((question) => {
      const userAnswer = input.answers[question.id];
      const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(question.answer || question.answerText || '');
      if (isCorrect) correctCount += 1;
      return { id: question.id, userAnswer, isCorrect };
    });
    const totalCount = existing.questions.length;
    const wrongCount = totalCount - correctCount;
    const accuracyPercent = Math.round((correctCount / totalCount) * 100);
    const masteryAfter = masteryFromAccuracy(totalCount, accuracyPercent);
    const masteryBefore = (existing.masteryBefore ?? 'WEAK') as MasteryStatus;
    const updated = await prisma.$transaction(async (tx) => {
      for (const question of questionUpdates) {
        await tx.practiceQuestion.update({ where: { id: question.id }, data: { userAnswer: question.userAnswer, isCorrect: question.isCorrect } });
      }
      const knowledgePointId = existing.questions[0]?.knowledgePointId;
      const knowledgePointText = existing.knowledgePointText ?? existing.questions[0]?.knowledgePointText ?? '';
      if (knowledgePointId) {
        await tx.childKnowledgePoint.upsert({
          where: { childId_knowledgePointId: { childId: existing.childId, knowledgePointId } },
          create: { childId: existing.childId, knowledgePointId, knowledgePointText, status: masteryAfter, masteryScore: masteryScore(masteryAfter, accuracyPercent), practiceCount: totalCount, correctCount, wrongCount, lastPracticedAt: new Date() },
          update: { status: masteryAfter, masteryScore: masteryScore(masteryAfter, accuracyPercent), practiceCount: { increment: totalCount }, correctCount: { increment: correctCount }, wrongCount: { increment: wrongCount }, lastPracticedAt: new Date() },
        });
      } else if (knowledgePointText) {
        await tx.childKnowledgePoint.upsert({
          where: { childId_knowledgePointText: { childId: existing.childId, knowledgePointText } },
          create: { childId: existing.childId, knowledgePointText, status: masteryAfter, masteryScore: masteryScore(masteryAfter, accuracyPercent), practiceCount: totalCount, correctCount, wrongCount, lastPracticedAt: new Date() },
          update: { status: masteryAfter, masteryScore: masteryScore(masteryAfter, accuracyPercent), practiceCount: { increment: totalCount }, correctCount: { increment: correctCount }, wrongCount: { increment: wrongCount }, lastPracticedAt: new Date() },
        });
      }
      return tx.practiceSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', endedAt: new Date(), correctCount, accuracy: accuracyPercent, masteryBefore, masteryAfter },
        include: { questions: true },
      });
    });
    const session = sessionFromDb(updated);
    return {
      session,
      correctCount,
      totalCount,
      correctRate: toAccuracyRatio(correctCount, totalCount),
      masteryStatus: masteryAfter,
      results: session.questions.map((question) => ({ questionId: question.id, userAnswer: question.userAnswer, isCorrect: question.isCorrect, answer: question.answerText, explanation: question.analysis })),
    };
  },

  getMemoryChildKnowledgePoint(childId: string, knowledgePointId: string) {
    return memoryState().mastery.get(`${childId}:${knowledgePointId}`) ?? null;
  },
};

export function resetPracticeStoreForTest() {
  resetMemoryState();
}
