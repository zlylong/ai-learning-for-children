import { describe, expect, it } from 'vitest';
import { analyzeWrongQuestionsSchema } from './analyzeWrongQuestionsSchema';

describe('analyzeWrongQuestionsSchema', () => {
  it('accepts the required strict AI wrong question JSON shape', () => {
    const parsed = analyzeWrongQuestionsSchema.parse({
      wrongQuestions: [{
        questionText: '36 + 27 = ?',
        userAnswer: '62',
        correctAnswer: '63',
        analysis: '个位相加满十后需要向十位进 1。',
        knowledgePoints: [{ title: '两位数加法进位', confidence: 0.9 }],
      }],
    });

    expect(parsed.wrongQuestions[0].knowledgePoints[0].confidence).toBe(0.9);
  });

  it('rejects more than three knowledge points and invalid confidence', () => {
    const parsed = analyzeWrongQuestionsSchema.safeParse({
      wrongQuestions: [{
        questionText: '36 + 27 = ?',
        userAnswer: '62',
        correctAnswer: '63',
        analysis: '分析',
        knowledgePoints: [
          { title: 'A', confidence: 0.2 },
          { title: 'B', confidence: 0.4 },
          { title: 'C', confidence: 0.6 },
          { title: 'D', confidence: 1.2 },
        ],
      }],
    });

    expect(parsed.success).toBe(false);
  });
});
