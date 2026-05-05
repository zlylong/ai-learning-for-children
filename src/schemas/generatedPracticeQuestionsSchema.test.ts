import { describe, expect, it } from 'vitest';
import { generatedPracticeQuestionsSchema } from './generatedPracticeQuestionsSchema';

describe('generatedPracticeQuestionsSchema', () => {
  it('requires single choice questions to have exactly four options', () => {
    const parsed = generatedPracticeQuestionsSchema.safeParse({
      questions: [{
        questionText: '36 + 27 = ?',
        questionType: 'single_choice',
        options: ['62', '63', '64', '73'],
        answer: '63',
        explanation: '个位满十进一。',
        knowledgePointTitle: '两位数加法进位',
        difficulty: 'easy',
      }],
    });

    expect(parsed.success).toBe(true);

    const invalid = generatedPracticeQuestionsSchema.safeParse({
      questions: [{
        questionText: '36 + 27 = ?',
        questionType: 'single_choice',
        options: ['62', '63'],
        answer: '63',
        explanation: '个位满十进一。',
        knowledgePointTitle: '两位数加法进位',
        difficulty: 'easy',
      }],
    });
    expect(invalid.success).toBe(false);

    const invalidAnswer = generatedPracticeQuestionsSchema.safeParse({
      questions: [{
        questionText: '36 + 27 = ?',
        questionType: 'single_choice',
        options: ['62', '64', '72', '73'],
        answer: '63',
        explanation: '个位满十进一。',
        knowledgePointTitle: '两位数加法进位',
        difficulty: 'easy',
      }],
    });
    expect(invalidAnswer.success).toBe(false);
  });

  it('rejects missing explanation or answer', () => {
    const parsed = generatedPracticeQuestionsSchema.safeParse({
      questions: [{
        questionText: '填空：36 + 27 = ____',
        questionType: 'fill_blank',
        options: [],
        answer: '',
        explanation: '',
        knowledgePointTitle: '两位数加法进位',
        difficulty: 'medium',
      }],
    });

    expect(parsed.success).toBe(false);
  });
});
