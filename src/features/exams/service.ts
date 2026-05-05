import { Prisma } from '@prisma/client';
import { analyzeExamWithAi } from '@/ai/ai-client';
import { prisma } from '@/lib/prisma';
import { memoryExamStore } from './memory-store';
import type { ExamUploadInput, ExamUploadRecord, WrongQuestionRecord } from './schema';

function shouldUseMemoryStore() {
  return !process.env.DATABASE_URL || process.env.CHILDREN_STORE === 'memory';
}

function uploadToRecord(upload: {
  id: string; childId: string; title: string; rawText: string | null; imageCount: number | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; uploadedAt: Date; processedAt: Date | null; createdAt: Date; updatedAt: Date;
}): ExamUploadRecord {
  return {
    id: upload.id,
    childId: upload.childId,
    title: upload.title,
    rawText: upload.rawText ?? '',
    imageCount: upload.imageCount ?? 0,
    status: upload.status,
    uploadedAt: upload.uploadedAt.toISOString(),
    processedAt: upload.processedAt?.toISOString() ?? null,
    createdAt: upload.createdAt.toISOString(),
    updatedAt: upload.updatedAt.toISOString(),
  };
}

function wrongToRecord(wrong: {
  id: string; childId: string; examUploadId: string | null; questionText: string; studentAnswer: string | null; correctAnswer: string | null; errorReason: string | null; knowledgePointText: string | null; createdAt: Date; updatedAt: Date;
}): WrongQuestionRecord {
  return {
    id: wrong.id,
    childId: wrong.childId,
    examUploadId: wrong.examUploadId,
    questionText: wrong.questionText,
    studentAnswer: wrong.studentAnswer ?? '',
    correctAnswer: wrong.correctAnswer ?? '',
    errorReason: wrong.errorReason ?? '',
    knowledgePoint: wrong.knowledgePointText ?? '',
    createdAt: wrong.createdAt.toISOString(),
    updatedAt: wrong.updatedAt.toISOString(),
  };
}

async function withFallback<T>(operation: () => Promise<T>, fallback: () => T): Promise<T> {
  if (shouldUseMemoryStore()) return fallback();
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
      console.warn('[exams] Prisma unavailable, falling back to memory store:', error.message);
      return fallback();
    }
    throw error;
  }
}

export const examService = {
  async analyzeAndCreate(input: ExamUploadInput): Promise<{ upload: ExamUploadRecord; wrongQuestions: WrongQuestionRecord[] }> {
    const aiResult = await analyzeExamWithAi({ childId: input.childId, text: input.text, imageCount: input.imageCount });
    const wrongQuestions = aiResult.wrongQuestions;

    return withFallback(async () => {
      const now = new Date();
      const result = await prisma.$transaction(async (tx) => {
        const upload = await tx.examUpload.create({
          data: {
            childId: input.childId,
            title: input.text.split(/\n+/).find(Boolean)?.slice(0, 24) || `图片试卷分析 ${input.imageCount} 张`,
            rawText: input.text,
            imageCount: input.imageCount,
            status: 'COMPLETED',
            processedAt: now,
          },
        });
        const createdWrongQuestions = await Promise.all(wrongQuestions.map((item) => tx.wrongQuestion.create({
          data: {
            childId: input.childId,
            examUploadId: upload.id,
            questionText: item.questionText,
            studentAnswer: item.studentAnswer,
            correctAnswer: item.correctAnswer,
            errorReason: item.errorReason,
            knowledgePointText: item.knowledgePoint,
            answerText: item.correctAnswer,
            analysis: item.errorReason,
          },
        })));
        return { upload, wrongQuestions: createdWrongQuestions };
      });
      return { upload: uploadToRecord(result.upload), wrongQuestions: result.wrongQuestions.map(wrongToRecord) };
    }, () => memoryExamStore.createCompletedUpload({ childId: input.childId, rawText: input.text, imageCount: input.imageCount, wrongQuestions }));
  },

  listUploads(childId: string): Promise<ExamUploadRecord[]> {
    return withFallback(async () => {
      const uploads = await prisma.examUpload.findMany({ where: { childId }, orderBy: { uploadedAt: 'desc' } });
      return uploads.map(uploadToRecord);
    }, () => memoryExamStore.listUploads(childId));
  },

  listWrongQuestions(childId: string): Promise<WrongQuestionRecord[]> {
    return withFallback(async () => {
      const wrongQuestions = await prisma.wrongQuestion.findMany({ where: { childId }, orderBy: { createdAt: 'desc' } });
      return wrongQuestions.map(wrongToRecord);
    }, () => memoryExamStore.listWrongQuestions(childId));
  },
};
