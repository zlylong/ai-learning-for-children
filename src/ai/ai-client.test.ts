import { describe, expect, it } from 'vitest';
import { examAnalysisOutputSchema, analyzeExamWithAi } from './ai-client';

describe('examAnalysisOutputSchema', () => {
  it('rejects incomplete AI wrong question output so dirty data is not persisted', () => {
    const parsed = examAnalysisOutputSchema.safeParse({
      wrongQuestions: [
        {
          questionText: '1 + 1 = ?',
          studentAnswer: '3',
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('mock AI returns validated wrong question cards', async () => {
    const result = await analyzeExamWithAi({ childId: 'demo-child-1', text: '数学试卷：1+1=3', imageCount: 1 });

    expect(result.wrongQuestions.length).toBeGreaterThan(0);
    expect(result.wrongQuestions[0]).toMatchObject({
      questionText: expect.any(String),
      studentAnswer: expect.any(String),
      correctAnswer: expect.any(String),
      errorReason: expect.any(String),
      knowledgePoint: expect.any(String),
    });
  });
});
