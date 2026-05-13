import { describe, expect, it } from 'vitest';
import { buildExplainableRecommendations } from './home-recommendations';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';

function wrong(title: string, createdAt: string): WrongQuestionRecord {
  return {
    id: `${title}-${createdAt}`,
    childId: 'child-1',
    subject: '数学',
    questionText: '题目',
    userAnswer: '1',
    correctAnswer: '2',
    analysis: '解析',
    source: 'manual',
    createdAt,
    knowledgePoints: [{ id: title, knowledgePointId: title, title, confidence: 0.9 }],
  };
}

describe('home explainable recommendations', () => {
  it('prioritizes recent wrong-question frequency and exposes a reason', () => {
    const recommendations = buildExplainableRecommendations({
      now: new Date('2026-05-12T00:00:00.000Z'),
      wrongQuestions: [
        wrong('有理数加减法', '2026-05-10T00:00:00.000Z'),
        wrong('有理数加减法', '2026-05-11T00:00:00.000Z'),
        wrong('线段与角', '2026-04-01T00:00:00.000Z'),
      ],
      sessions: [],
    });

    expect(recommendations[0]).toMatchObject({
      knowledgePoint: '有理数加减法',
      reason: '近7天错题最多，建议趁热订正',
      metrics: expect.objectContaining({ wrongCount: 2, recentWrongCount: 2 }),
    });
  });

  it('uses recent practice time and accuracy trend in the score', () => {
    const recommendations = buildExplainableRecommendations({
      now: new Date('2026-05-12T00:00:00.000Z'),
      wrongQuestions: [],
      sessions: [
        { status: 'COMPLETED', knowledgePoint: '阅读理解', startedAt: '2026-05-01T00:00:00.000Z', result: { accuracy: 90 } },
        { status: 'COMPLETED', knowledgePoint: '阅读理解', startedAt: '2026-05-05T00:00:00.000Z', result: { accuracy: 75 } },
        { status: 'COMPLETED', knowledgePoint: '阅读理解', startedAt: '2026-05-10T00:00:00.000Z', result: { accuracy: 50 } },
      ],
    });

    expect(recommendations[0]).toMatchObject({
      knowledgePoint: '阅读理解',
      reason: '近3次正确率下降，需要及时稳住',
      metrics: expect.objectContaining({ recentAccuracy: 72 }),
    });
  });
});
