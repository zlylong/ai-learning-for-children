import { beforeEach, describe, expect, it } from 'vitest';
import { practiceService, resetPracticeStoreForTest } from './service';

describe('practiceService', () => {
  beforeEach(() => {
    resetPracticeStoreForTest();
  });

  it('creates a validated AI generated mobile practice session', async () => {
    const session = await practiceService.createSession({
      childId: 'demo-child-1',
      knowledgePoint: '两位数加法进位',
      questionCount: 5,
      difficulty: 'MEDIUM',
      questionType: 'CHOICE',
    });

    expect(session.status).toBe('ACTIVE');
    expect(session.questions).toHaveLength(5);
    expect(session.questions[0]).toMatchObject({
      stem: expect.any(String),
      answerText: expect.any(String),
      analysis: expect.any(String),
      options: expect.any(Array),
    });
  });

  it('rejects incomplete answer submissions instead of saving blank answers', async () => {
    const session = await practiceService.createSession({
      childId: 'demo-child-1',
      knowledgePoint: '两位数加法进位',
      questionCount: 3,
      difficulty: 'EASY',
      questionType: 'CHOICE',
    });

    await expect(practiceService.submitSession(session.id, {
      answers: [{ questionId: session.questions[0].id, userAnswer: session.questions[0].answerText }],
    })).rejects.toThrow('请完成所有题目后再提交');
  });

  it('submits answers, stores userAnswer/isCorrect, and marks 80 percent as mastered', async () => {
    const session = await practiceService.createSession({
      childId: 'demo-child-1',
      knowledgePoint: '两位数加法进位',
      questionCount: 5,
      difficulty: 'EASY',
      questionType: 'FILL_BLANK',
    });

    const submitted = await practiceService.submitSession(session.id, {
      answers: session.questions.map((question, index) => ({
        questionId: question.id,
        userAnswer: index === 0 ? '错误答案' : question.answerText,
      })),
    });

    expect(submitted.status).toBe('COMPLETED');
    expect(submitted.result?.accuracy).toBe(80);
    expect(submitted.result?.masteryAfter).toBe('MASTERED');
    expect(submitted.questions[0].userAnswer).toBe('错误答案');
    expect(submitted.questions[0].isCorrect).toBe(false);
    expect(submitted.questions[1].isCorrect).toBe(true);
  });
});
