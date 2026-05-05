import { z } from 'zod';
import type { AnalyzeWrongQuestionsResult } from './analyzeWrongQuestionsSchema';

export const examUploadCreateSchema = z.object({
  childId: z.string().trim().min(1, '缺少孩子 ID'),
  subject: z.string().trim().min(1, '请选择科目').max(20, '科目过长'),
  rawText: z.string().trim().min(1, '请粘贴试卷文本或上传图片').max(10000, '试卷文本过长'),
}).strict();

export const examUploadFormSchema = z.object({
  subject: z.string().trim().min(1, '请选择科目').max(20, '科目过长'),
  rawText: z.string().trim().max(10000, '试卷文本过长'),
  imageCount: z.number().int().min(0).max(9),
}).refine((value) => value.rawText.length > 0 || value.imageCount > 0, {
  message: '请粘贴试卷文本或上传图片',
  path: ['rawText'],
});

export const examUploadQuerySchema = z.object({
  childId: z.string().trim().min(1, '缺少 childId'),
});

export type ExamUploadCreateInput = z.infer<typeof examUploadCreateSchema>;
export type ExamUploadFormValues = z.infer<typeof examUploadFormSchema>;

export type ExamUploadRecord = {
  id: string;
  childId: string;
  subject: string;
  rawText: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  resultJson: AnalyzeWrongQuestionsResult | null;
  createdAt: string;
};

export type WrongQuestionKnowledgePointRecord = {
  id: string;
  knowledgePointId: string;
  title: string;
  confidence: number;
};

export type WrongQuestionRecord = {
  id: string;
  childId: string;
  subject: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  analysis: string;
  source: string;
  createdAt: string;
  knowledgePoints: WrongQuestionKnowledgePointRecord[];
};
