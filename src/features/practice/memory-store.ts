import type { PracticeQuestionAi } from '../../ai/ai-client';
import { masteryFromAccuracy, type MasteryStatus, type PracticeSessionCreateInput, type PracticeSessionRecord, type PracticeSubmitInput } from './schema';

function now() { return new Date().toISOString(); }
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function normalizeAnswer(value: string) { return value.trim().replace(/\s+/g, '').toLowerCase(); }

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

class PracticeMemoryStore {
  private sessions = new Map<string, PracticeSessionRecord>();
  private mastery = new Map<string, MasteryStatus>();

  reset() {
    this.sessions.clear();
    this.mastery.clear();
  }

  getMastery(childId: string, knowledgePoint: string): MasteryStatus {
    return this.mastery.get(`${childId}:${knowledgePoint}`) ?? 'WEAK';
  }

  create(input: PracticeSessionCreateInput, questions: PracticeQuestionAi[]): PracticeSessionRecord {
    const sessionId = id('practice');
    const session: PracticeSessionRecord = {
      id: sessionId,
      childId: input.childId,
      title: `${input.knowledgePoint} · ${input.questionCount}题练习`,
      status: 'ACTIVE',
      knowledgePoint: input.knowledgePoint,
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
        stem: question.stem,
        options: question.options,
        answerText: question.answerText,
        analysis: question.analysis,
        knowledgePoint: question.knowledgePoint,
        userAnswer: null,
        isCorrect: null,
      })),
    };
    this.sessions.set(session.id, session);
    return structuredClone(session);
  }

  get(sessionId: string): PracticeSessionRecord | null {
    const session = this.sessions.get(sessionId);
    return session ? structuredClone(session) : null;
  }

  submit(sessionId: string, input: PracticeSubmitInput): PracticeSessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('练习不存在');
    validateCompleteAnswers(session.questions.map((question) => question.id), input);
    const before = this.getMastery(session.childId, session.knowledgePoint);
    const answerMap = new Map(input.answers.map((item) => [item.questionId, item.userAnswer]));
    let correctCount = 0;
    session.questions = session.questions.map((question) => {
      const userAnswer = answerMap.get(question.id) ?? '';
      const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(question.answerText);
      if (isCorrect) correctCount += 1;
      return { ...question, userAnswer, isCorrect };
    });
    const totalCount = session.questions.length;
    const accuracy = Math.round((correctCount / totalCount) * 100);
    const masteryAfter = masteryFromAccuracy(totalCount, accuracy);
    session.status = 'COMPLETED';
    session.endedAt = now();
    session.result = { correctCount, totalCount, accuracy, masteryBefore: before, masteryAfter };
    this.mastery.set(`${session.childId}:${session.knowledgePoint}`, masteryAfter);
    this.sessions.set(session.id, session);
    return structuredClone(session);
  }
}

export const memoryPracticeStore = new PracticeMemoryStore();
