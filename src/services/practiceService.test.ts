import { beforeEach, describe, expect, it } from 'vitest';
import { practiceSessionCreateSchema } from '../features/practice/schema';
import { practiceService, resetPracticeStoreForTest } from './practiceService';

describe('practiceService public API', () => {
  beforeEach(() => resetPracticeStoreForTest());

  it('accepts knowledgePointId input, creates a session, hides answers before submit, then updates mastery counters', async () => {
    const createInput = practiceSessionCreateSchema.parse({
      childId: 'demo-child-1',
      knowledgePointId: 'kp-carry-addition',
      questionCount: 5,
      difficulty: 'easy',
      questionType: 'single_choice',
    });

    const created = await practiceService.createPracticeSession(createInput);
    expect(created.sessionId).toMatch(/^practice/);

    const session = await practiceService.getPracticeSession(created.sessionId);
    expect(session?.questions).toHaveLength(5);
    expect(session?.questions[0]).not.toHaveProperty('answer');

    const full = await practiceService.getPracticeSessionForResult(created.sessionId);
    expect(full?.questions[0].answerText).toBeTruthy();

    const submitted = await practiceService.submitPracticeSession(created.sessionId, {
      answers: Object.fromEntries(full!.questions.map((question, index) => [question.id, index === 0 ? '错误答案' : question.answerText])),
    });

    expect(submitted.correctRate).toBe(0.8);
    expect(submitted.masteryStatus).toBe('MASTERED');
    expect(submitted.results[0]).toMatchObject({ isCorrect: false, userAnswer: '错误答案' });

    const mastery = practiceService.getMemoryChildKnowledgePoint('demo-child-1', 'kp-carry-addition');
    expect(mastery).toMatchObject({ status: 'MASTERED', practiceCount: 5, correctCount: 4, wrongCount: 1 });

    await expect(practiceService.submitPracticeSession(created.sessionId, {
      answers: Object.fromEntries(full!.questions.map((question) => [question.id, question.answerText])),
    })).rejects.toThrow('不能重复提交');
    const afterDuplicate = practiceService.getMemoryChildKnowledgePoint('demo-child-1', 'kp-carry-addition');
    expect(afterDuplicate).toMatchObject({ practiceCount: 5, correctCount: 4, wrongCount: 1 });
  });

  it('creates mixed single-choice and fill-blank practice sessions for custom intensity', async () => {
    const created = await practiceService.createPracticeSession({
      childId: 'demo-child-1',
      knowledgePointId: 'kp-carry-addition',
      questionCount: 3,
      difficulty: 'easy',
      questionType: 'mixed',
    });

    const full = await practiceService.getPracticeSessionForResult(created.sessionId);
    expect(full).toMatchObject({ questionCount: 3, difficulty: 'easy', questionType: 'mixed' });
    expect(full?.questions.map((question) => question.questionType)).toEqual(['single_choice', 'fill_blank', 'single_choice']);
  });

  it('does not create a session when AI output fails schema validation', async () => {
    await expect(practiceService.createPracticeSession({
      childId: 'demo-child-1',
      knowledgePointId: 'INVALID_AI_OUTPUT',
      questionCount: 5,
      difficulty: 'easy',
      questionType: 'single_choice',
    })).rejects.toThrow('AI 练习题生成结果校验失败');
  });
});
