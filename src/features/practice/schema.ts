import { z } from 'zod';
import { generatedPracticeDifficultySchema, generatedPracticeQuestionTypeSchema } from '../../schemas/generatedPracticeQuestionsSchema';

export const masteryStatusSchema = z.enum(['WEAK', 'PRACTICING', 'MASTERED']);

export const practiceDifficultySchema = z.preprocess((value) => typeof value === 'string' ? value.toLowerCase() : value, generatedPracticeDifficultySchema);
export const practiceQuestionTypeSchema = z.preprocess((value) => {
  if (value === 'CHOICE') return 'single_choice';
  if (value === 'FILL_BLANK') return 'fill_blank';
  if (value === 'JUDGEMENT') return 'single_choice';
  return typeof value === 'string' ? value : value;
}, generatedPracticeQuestionTypeSchema);

export const practiceSessionCreateSchema = z.object({
  childId: z.string().min(1, '缺少孩子 ID'),
  knowledgePointId: z.string().trim().min(1, '请选择知识点').optional(),
  knowledgePoint: z.string().trim().min(1, '请选择知识点').optional(),
  questionCount: z.number().int().min(1).max(10),
  difficulty: practiceDifficultySchema,
  questionType: practiceQuestionTypeSchema,
}).refine((input) => input.knowledgePointId || input.knowledgePoint, { message: '请选择知识点', path: ['knowledgePointId'] });

export const practiceSubmitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1),
    userAnswer: z.string().trim().min(1, '请填写答案'),
  })).min(1),
});

export type MasteryStatus = z.infer<typeof masteryStatusSchema>;
export type PracticeDifficulty = z.infer<typeof practiceDifficultySchema>;
export type PracticeQuestionType = z.infer<typeof practiceQuestionTypeSchema>;
export type PracticeSessionCreateInput = z.infer<typeof practiceSessionCreateSchema>;
export type PracticeSubmitInput = z.infer<typeof practiceSubmitSchema>;

export type PracticeQuestionRecord = {
  id: string;
  sessionId: string;
  order: number;
  stem: string;
  questionText: string;
  questionType: PracticeQuestionType;
  options: string[];
  answerText: string;
  answer: string;
  analysis: string;
  explanation: string;
  knowledgePoint: string;
  knowledgePointId: string | null;
  userAnswer: string | null;
  isCorrect: boolean | null;
};

export type PracticeSessionRecord = {
  id: string;
  childId: string;
  title: string;
  type?: 'KNOWLEDGE_POINT' | 'MONTHLY_WRONG_SET';
  subject?: string | null;
  sourceMonth?: string | null;
  summaryJson?: unknown;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  knowledgePoint: string;
  questionCount: number;
  difficulty: PracticeDifficulty;
  questionType: PracticeQuestionType;
  startedAt: string;
  endedAt: string | null;
  result: null | {
    correctCount: number;
    totalCount: number;
    accuracy: number;
    masteryBefore: MasteryStatus;
    masteryAfter: MasteryStatus;
  };
  questions: PracticeQuestionRecord[];
};

export function masteryFromAccuracy(totalCount: number, accuracy: number): MasteryStatus {
  if (totalCount >= 5 && accuracy >= 80) return 'MASTERED';
  if (accuracy >= 50 && accuracy < 80) return 'PRACTICING';
  return 'WEAK';
}
