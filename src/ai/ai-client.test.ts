import { describe, expect, it } from 'vitest';
import {
  analyzeExamWithAi,
  generatePracticeWithAi,
  examAnalysisOutputSchema,
  practiceGenerationOutputSchema,
} from './ai-client';

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

describe('practiceGenerationOutputSchema', () => {
  it('rejects incomplete AI practice question output', () => {
    const parsed = practiceGenerationOutputSchema.safeParse({
      questions: [{ stem: '36 + 27 = ?', answerText: '63' }],
    });

    expect(parsed.success).toBe(false);
  });

  it('mock AI returns the requested number of validated practice questions', async () => {
    const result = await generatePracticeWithAi({
      childId: 'demo-child-1',
      knowledgePoint: '两位数加法进位',
      questionCount: 3,
      difficulty: 'EASY',
      questionType: 'CHOICE',
    });

    expect(result.questions).toHaveLength(3);
    expect(result.questions[0]).toMatchObject({
      stem: expect.any(String),
      answerText: expect.any(String),
      analysis: expect.any(String),
      options: expect.any(Array),
    });
  });
});
