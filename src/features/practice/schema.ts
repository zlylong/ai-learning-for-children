import { z } from 'zod';
import { practiceDifficultySchema, practiceQuestionTypeSchema } from '../../ai/ai-client';

export const masteryStatusSchema = z.enum(['WEAK', 'PRACTICING', 'MASTERED']);

export const practiceSessionCreateSchema = z.object({
  childId: z.string().min(1, '缺少孩子 ID'),
  knowledgePoint: z.string().trim().min(1, '请选择知识点'),
  questionCount: z.number().int().min(1).max(10),
  difficulty: practiceDifficultySchema,
  questionType: practiceQuestionTypeSchema,
});

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
  options: string[];
  answerText: string;
  analysis: string;
  knowledgePoint: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
};

export type PracticeSessionRecord = {
  id: string;
  childId: string;
  title: string;
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
