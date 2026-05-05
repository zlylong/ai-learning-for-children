import type { ExamUploadRecord, WrongQuestionRecord } from './schema';

type State = {
  uploads: ExamUploadRecord[];
  wrongQuestions: WrongQuestionRecord[];
};

const globalForExamStore = globalThis as typeof globalThis & { __aiLearningExamStore?: State };

function state(): State {
  globalForExamStore.__aiLearningExamStore ??= { uploads: [], wrongQuestions: [] };
  return globalForExamStore.__aiLearningExamStore;
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const memoryExamStore = {
  listUploads(childId: string) {
    return state().uploads.filter((item) => item.childId === childId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  },
  listWrongQuestions(childId: string) {
    return state().wrongQuestions.filter((item) => item.childId === childId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  createCompletedUpload(input: { childId: string; rawText: string; imageCount: number; wrongQuestions: Array<Omit<WrongQuestionRecord, 'id' | 'childId' | 'examUploadId' | 'createdAt' | 'updatedAt'>> }) {
    const now = new Date().toISOString();
    const upload: ExamUploadRecord = {
      id: id('upload'),
      childId: input.childId,
      title: input.rawText.split(/\n+/).find(Boolean)?.slice(0, 24) || `图片试卷分析 ${input.imageCount} 张`,
      rawText: input.rawText,
      imageCount: input.imageCount,
      status: 'DONE',
      uploadedAt: now,
      processedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const wrongQuestions: WrongQuestionRecord[] = input.wrongQuestions.map((item) => ({
      id: id('wrong'),
      childId: input.childId,
      examUploadId: upload.id,
      ...item,
      createdAt: now,
      updatedAt: now,
    }));
    state().uploads.unshift(upload);
    state().wrongQuestions.unshift(...wrongQuestions);
    return { upload, wrongQuestions };
  },
};
