import { z } from 'zod';

export const generatedPracticeQuestionTypeSchema = z.enum(['single_choice', 'fill_blank', 'short_answer']);
export const generatedPracticeDifficultySchema = z.enum(['easy', 'medium', 'hard']);

export const generatedPracticeQuestionSchema = z.object({
  questionText: z.string().trim().min(1, '题干不能为空'),
  questionType: generatedPracticeQuestionTypeSchema,
  options: z.array(z.string().trim().min(1)).default([]),
  answer: z.string().trim().min(1, '答案不能为空'),
  explanation: z.string().trim().min(1, '解析不能为空'),
  knowledgePointTitle: z.string().trim().min(1, '知识点不能为空'),
  difficulty: generatedPracticeDifficultySchema,
}).strict().superRefine((question, ctx) => {
  if (question.questionType === 'single_choice' && question.options.length !== 4) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: '单选题必须包含 4 个选项' });
  }
  if (question.questionType === 'single_choice' && !question.options.includes(question.answer)) {
    ctx.addIssue({ code: 'custom', path: ['answer'], message: '单选题答案必须存在于选项中' });
  }
  if (question.questionType !== 'single_choice' && question.options.length !== 0) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: '填空题和简答题 options 必须为空数组' });
  }
});

export const generatedPracticeQuestionsSchema = z.object({
  questions: z.array(generatedPracticeQuestionSchema).min(1).max(10),
}).strict();

export type GeneratedPracticeQuestion = z.infer<typeof generatedPracticeQuestionSchema>;
export type GeneratedPracticeQuestions = z.infer<typeof generatedPracticeQuestionsSchema>;
export type GeneratedPracticeQuestionType = z.infer<typeof generatedPracticeQuestionTypeSchema>;
export type GeneratedPracticeDifficulty = z.infer<typeof generatedPracticeDifficultySchema>;
