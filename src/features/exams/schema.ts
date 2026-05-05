import { z } from 'zod';
import { examWrongQuestionSchema } from '@/ai/ai-client';

export const examUploadInputSchema = z.object({
  childId: z.string().min(1, '缺少孩子 ID'),
  text: z.string().trim().max(10000, '试卷文本过长'),
  imageCount: z.number().int().min(0).max(9),
}).refine((value) => value.text.length > 0 || value.imageCount > 0, {
  message: '请粘贴试卷结果文本或上传图片',
  path: ['text'],
});

export const examUploadFormSchema = z.object({
  text: z.string().trim().max(10000, '试卷文本过长'),
  imageCount: z.number().int().min(0).max(9),
}).refine((value) => value.text.length > 0 || value.imageCount > 0, {
  message: '请粘贴试卷结果文本或上传图片',
  path: ['text'],
});

export type ExamUploadInput = z.infer<typeof examUploadInputSchema>;
export type ExamUploadFormValues = z.infer<typeof examUploadFormSchema>;

export type ExamUploadRecord = {
  id: string;
  childId: string;
  title: string;
  rawText: string;
  imageCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadedAt: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WrongQuestionRecord = z.infer<typeof examWrongQuestionSchema> & {
  id: string;
  childId: string;
  examUploadId: string | null;
  createdAt: string;
  updatedAt: string;
};
