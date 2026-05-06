import { z } from 'zod';
import { 
  generatedPracticeQuestionSchema, 
} from './generatedPracticeQuestionsSchema';

export const generatedExamSchema = z.object({
  title: z.string().trim().min(1, '试卷标题不能为空'),
  questions: z.array(generatedPracticeQuestionSchema).min(1).max(30),
}).strict();

export type GeneratedExam = z.infer<typeof generatedExamSchema>;
