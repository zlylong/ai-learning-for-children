import { Prisma } from '@prisma/client';
import { aiClient } from '../ai/ai-client';
import { analyzeWrongQuestionsPrompt } from '../ai/prompts/analyzeWrongQuestionsPrompt';
import { childService } from '../features/children/service';
import { prisma } from '../lib/prisma';
import { analyzeWrongQuestionsSchema, type AnalyzeWrongQuestionsResult, type AnalyzedKnowledgePoint } from '../schemas/analyzeWrongQuestionsSchema';
import { examUploadCreateSchema, type ExamUploadCreateInput, type ExamUploadRecord, type WrongQuestionKnowledgePointRecord, type WrongQuestionRecord } from '../schemas/examUploadSchema';
import { loadLearningPointCatalog } from '../features/learning-points/loader';

const DEMO_USER_ID = 'demo-user';
const PENDING_KNOWLEDGE_POINT = '待确认知识点';

function shouldUseMemoryStore() {
  return !process.env.DATABASE_URL || process.env.CHILDREN_STORE === 'memory';
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function titleFromText(text: string) {
  return text.split(/\n+/).find(Boolean)?.slice(0, 24) || '试卷错题分析';
}

async function assertChildOwnedByCurrentUser(childId: string) {
  if (shouldUseMemoryStore()) {
    const child = await childService.get(childId);
    if (!child) throw new Error('孩子档案不存在或无权访问');
    return;
  }

  try {
    const child = await prisma.child.findFirst({ where: { id: childId, userId: DEMO_USER_ID }, select: { id: true } });
    if (!child) throw new Error('孩子档案不存在或无权访问');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
      const child = await childService.get(childId);
      if (!child) throw new Error('孩子档案不存在或无权访问');
      return;
    }
    throw error;
  }
}

function toUploadRecord(upload: {
  id: string;
  childId: string;
  subject: string;
  rawText: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  resultJson: Prisma.JsonValue | null;
  createdAt: Date;
}): ExamUploadRecord {
  return {
    id: upload.id,
    childId: upload.childId,
    subject: upload.subject,
    rawText: upload.rawText,
    status: upload.status,
    resultJson: upload.resultJson as AnalyzeWrongQuestionsResult | null,
    createdAt: upload.createdAt.toISOString(),
  };
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

function confidenceForFallback(point: AnalyzedKnowledgePoint) {
  return point.title === PENDING_KNOWLEDGE_POINT ? Math.min(point.confidence, 0.3) : point.confidence;
}

function uniqueByKnowledgePointId<T extends { knowledgePoint: { id: string }; confidence: number }>(items: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    const existing = byId.get(item.knowledgePoint.id);
    if (!existing || item.confidence > existing.confidence) byId.set(item.knowledgePoint.id, item);
  }
  return [...byId.values()];
}

async function promptLearningPointsForUpload(subject: string) {
  const catalog = await loadLearningPointCatalog({ grade: 'G03', subject, version: null }).catch(() => null);
  return catalog?.chapters.flatMap((chapter) => chapter.knowledgePoints).slice(0, 8) ?? [];
}

function uniqueMemoryLinks(items: WrongQuestionKnowledgePointRecord[]): WrongQuestionKnowledgePointRecord[] {
  const byId = new Map<string, WrongQuestionKnowledgePointRecord>();
  for (const item of items) {
    const existing = byId.get(item.knowledgePointId);
    if (!existing || item.confidence > existing.confidence) byId.set(item.knowledgePointId, item);
  }
  return [...byId.values()];
}

type MemoryKnowledgePoint = { id: string; title: string; subject: string };
type MemoryMastery = {
  childId: string;
  knowledgePointId: string;
  status: 'UNKNOWN' | 'WEAK' | 'PRACTICING' | 'MASTERED';
  wrongCount: number;
  practiceCount: number;
  correctCount: number;
  lastPracticedAt: string | null;
};

type MemoryState = {
  uploads: ExamUploadRecord[];
  wrongQuestions: WrongQuestionRecord[];
  knowledgePoints: MemoryKnowledgePoint[];
  childKnowledgePoints: MemoryMastery[];
};

const globalForExamUploadService = globalThis as typeof globalThis & { __aiLearningExamUploadService?: MemoryState };

function initialKnowledgePoints(): MemoryKnowledgePoint[] {
  return [
    { id: 'kp-carry-addition', title: '两位数加法进位', subject: '数学' },
    { id: 'kp-reading-summary', title: '阅读理解-内容概括', subject: '语文' },
    { id: 'kp-pending', title: PENDING_KNOWLEDGE_POINT, subject: '通用' },
  ];
}

function memoryState(): MemoryState {
  globalForExamUploadService.__aiLearningExamUploadService ??= {
    uploads: [],
    wrongQuestions: [],
    knowledgePoints: initialKnowledgePoints(),
    childKnowledgePoints: [],
  };
  return globalForExamUploadService.__aiLearningExamUploadService;
}

function resetMemoryState() {
  globalForExamUploadService.__aiLearningExamUploadService = {
    uploads: [],
    wrongQuestions: [],
    knowledgePoints: initialKnowledgePoints(),
    childKnowledgePoints: [],
  };
}

function matchMemoryKnowledgePoint(point: AnalyzedKnowledgePoint, subject: string): MemoryKnowledgePoint {
  const state = memoryState();
  const wanted = normalizeTitle(point.title);
  const exact = state.knowledgePoints.find((item) => normalizeTitle(item.title) === wanted);
  if (exact) return exact;

  const fuzzy = state.knowledgePoints.find((item) => {
    const title = normalizeTitle(item.title);
    return title.includes(wanted) || wanted.includes(title);
  });
  if (fuzzy) return fuzzy;

  return state.knowledgePoints.find((item) => item.title === PENDING_KNOWLEDGE_POINT)
    ?? { id: 'kp-pending', title: PENDING_KNOWLEDGE_POINT, subject };
}

function updateMemoryMastery(childId: string, knowledgePointId: string) {
  const state = memoryState();
  const existing = state.childKnowledgePoints.find((item) => item.childId === childId && item.knowledgePointId === knowledgePointId);
  if (existing) {
    existing.status = 'WEAK';
    existing.wrongCount += 1;
    existing.lastPracticedAt = now();
    return;
  }
  state.childKnowledgePoints.push({
    childId,
    knowledgePointId,
    status: 'WEAK',
    wrongCount: 1,
    practiceCount: 0,
    correctCount: 0,
    lastPracticedAt: now(),
  });
}

function wrongQuestionKnowledgePointsToRecord(points: Array<{ id: string; knowledgePointId: string; confidence: number; knowledgePoint: { name: string } }>): WrongQuestionKnowledgePointRecord[] {
  return points.map((point) => ({
    id: point.id,
    knowledgePointId: point.knowledgePointId,
    title: point.knowledgePoint.name,
    confidence: point.confidence,
  }));
}

function toWrongQuestionRecord(wrong: {
  id: string;
  childId: string;
  subject: string;
  questionText: string;
  userAnswer: string | null;
  studentAnswer: string | null;
  correctAnswer: string | null;
  analysis: string | null;
  errorReason: string | null;
  source: string | null;
  examUploadId: string | null;
  createdAt: Date;
  knowledgePoints: Array<{ id: string; knowledgePointId: string; confidence: number; knowledgePoint: { name: string } }>;
}): WrongQuestionRecord {
  return {
    id: wrong.id,
    childId: wrong.childId,
    subject: wrong.subject,
    questionText: wrong.questionText,
    userAnswer: wrong.userAnswer ?? wrong.studentAnswer ?? '',
    correctAnswer: wrong.correctAnswer ?? '',
    analysis: wrong.analysis ?? wrong.errorReason ?? '',
    source: wrong.source ?? wrong.examUploadId ?? '',
    createdAt: wrong.createdAt.toISOString(),
    knowledgePoints: wrongQuestionKnowledgePointsToRecord(wrong.knowledgePoints),
  };
}

async function matchDbKnowledgePoint(tx: Prisma.TransactionClient, point: AnalyzedKnowledgePoint, subject: string) {
  const subjectScopedWhere = { name: point.title, chapter: { textbook: { subject } } };
  const exact = await tx.knowledgePoint.findFirst({ where: subjectScopedWhere });
  if (exact) return { knowledgePoint: exact, confidence: point.confidence };

  const all = await tx.knowledgePoint.findMany({
    where: { chapter: { textbook: { subject } } },
    take: 200,
  });
  const wanted = normalizeTitle(point.title);
  const fuzzy = all.find((item) => {
    const title = normalizeTitle(item.name);
    return title.includes(wanted) || wanted.includes(title);
  });
  if (fuzzy) return { knowledgePoint: fuzzy, confidence: point.confidence };

  const pending = await ensureDbKnowledgePoint(tx, PENDING_KNOWLEDGE_POINT, subject);
  return { knowledgePoint: pending, confidence: confidenceForFallback({ ...point, title: PENDING_KNOWLEDGE_POINT }) };
}

async function ensureDbKnowledgePoint(tx: Prisma.TransactionClient, title: string, subject: string) {
  const existing = await tx.knowledgePoint.findFirst({ where: { name: title, chapter: { textbook: { subject } } } });
  if (existing) return existing;

  const textbook = await tx.textbook.upsert({
    where: { id: `default-textbook-${subject}` },
    update: {},
    create: { id: `default-textbook-${subject}`, subject, grade: '通用', version: '默认', title: `${subject}默认知识点库` },
  });
  const chapter = await tx.chapter.upsert({
    where: { id: `default-chapter-${subject}` },
    update: {},
    create: { id: `default-chapter-${subject}`, textbookId: textbook.id, title: '待分类知识点', order: 0 },
  });
  return tx.knowledgePoint.create({ data: { chapterId: chapter.id, name: title, description: 'AI 分析自动关联', order: 0 } });
}

async function withFallback<T>(operation: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  if (shouldUseMemoryStore()) return fallback();
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
      console.warn('[exam-upload-service] Prisma unavailable, falling back to memory store:', error.message);
      return fallback();
    }
    throw error;
  }
}

async function processWithMemory(uploadId: string) {
  const state = memoryState();
  const upload = state.uploads.find((item) => item.id === uploadId);
  if (!upload) throw new Error('上传记录不存在');
  if (upload.status === 'DONE') {
    return { upload, wrongQuestions: state.wrongQuestions.filter((item) => item.source === uploadId) };
  }

  upload.status = 'PROCESSING';
  const prompt = await analyzeWrongQuestionsPrompt({ subject: upload.subject, rawText: upload.rawText, learningPoints: await promptLearningPointsForUpload(upload.subject) });
  const rawResult = await aiClient.generateJson({ task: 'exam-analysis', prompt, subject: upload.subject, rawText: upload.rawText });
  const parsed = analyzeWrongQuestionsSchema.safeParse(rawResult);
  if (!parsed.success) {
    upload.status = 'FAILED';
    upload.resultJson = null;
    throw new Error('AI 错题分析结果校验失败');
  }

  const createdWrongQuestions = parsed.data.wrongQuestions.map((item) => {
    const linkedPoints = uniqueMemoryLinks(item.knowledgePoints.map((point) => {
      const matched = matchMemoryKnowledgePoint(point, upload.subject);
      return {
        id: makeId('wqkp'),
        knowledgePointId: matched.id,
        title: matched.title,
        confidence: matched.title === PENDING_KNOWLEDGE_POINT ? confidenceForFallback(point) : point.confidence,
      };
    }));
    linkedPoints.forEach((point) => updateMemoryMastery(upload.childId, point.knowledgePointId));

    return {
      id: makeId('wrong'),
      childId: upload.childId,
      subject: upload.subject,
      questionText: item.questionText,
      userAnswer: item.userAnswer,
      correctAnswer: item.correctAnswer,
      analysis: item.analysis,
      source: upload.id,
      createdAt: now(),
      knowledgePoints: linkedPoints,
    } satisfies WrongQuestionRecord;
  });

  upload.status = 'DONE';
  upload.resultJson = parsed.data;
  state.wrongQuestions.unshift(...createdWrongQuestions);
  return { upload, wrongQuestions: createdWrongQuestions };
}

export const examUploadService = {
  async createExamUpload(rawInput: ExamUploadCreateInput): Promise<ExamUploadRecord> {
    const input = examUploadCreateSchema.parse(rawInput);
    await assertChildOwnedByCurrentUser(input.childId);

    return withFallback(async () => {
      const upload = await prisma.examUpload.create({
        data: {
          childId: input.childId,
          subject: input.subject,
          title: titleFromText(input.rawText),
          rawText: input.rawText,
          status: 'PENDING',
        },
      });
      return toUploadRecord(upload);
    }, () => {
      const createdAt = now();
      const upload: ExamUploadRecord = {
        id: makeId('upload'),
        childId: input.childId,
        subject: input.subject,
        rawText: input.rawText,
        status: 'PENDING',
        resultJson: null,
        createdAt,
      };
      memoryState().uploads.unshift(upload);
      return upload;
    });
  },

  async getExamUpload(uploadId: string): Promise<ExamUploadRecord | null> {
    return withFallback(async () => {
      const upload = await prisma.examUpload.findUnique({ where: { id: uploadId } });
      return upload ? toUploadRecord(upload) : null;
    }, () => memoryState().uploads.find((item) => item.id === uploadId) ?? null);
  },

  async processExamUpload(uploadId: string): Promise<{ upload: ExamUploadRecord; wrongQuestions: WrongQuestionRecord[] }> {
    return withFallback(async () => {
      const upload = await prisma.examUpload.findUnique({ where: { id: uploadId } });
      if (!upload) throw new Error('上传记录不存在');
      await assertChildOwnedByCurrentUser(upload.childId);
      if (upload.status === 'DONE') {
        const existingWrongQuestions = await prisma.wrongQuestion.findMany({
          where: { examUploadId: uploadId },
          orderBy: { createdAt: 'desc' },
          include: { knowledgePoints: { include: { knowledgePoint: true } } },
        });
        return { upload: toUploadRecord(upload), wrongQuestions: existingWrongQuestions.map(toWrongQuestionRecord) };
      }
      await prisma.examUpload.update({ where: { id: uploadId }, data: { status: 'PROCESSING' } });

      try {
        const prompt = await analyzeWrongQuestionsPrompt({ subject: upload.subject, rawText: upload.rawText, learningPoints: await promptLearningPointsForUpload(upload.subject) });
        const rawResult = await aiClient.generateJson({ task: 'exam-analysis', prompt, subject: upload.subject, rawText: upload.rawText });
        const parsed = analyzeWrongQuestionsSchema.safeParse(rawResult);
        if (!parsed.success) {
          await prisma.examUpload.update({ where: { id: uploadId }, data: { status: 'FAILED' } });
          throw new Error('AI 错题分析结果校验失败');
        }

        return await prisma.$transaction(async (tx) => {
        const createdWrongQuestions = [];
        for (const item of parsed.data.wrongQuestions) {
          const linkedPoints = uniqueByKnowledgePointId(await Promise.all(item.knowledgePoints.map((point) => matchDbKnowledgePoint(tx, point, upload.subject))));
          const primary = linkedPoints[0]?.knowledgePoint;
          const wrong = await tx.wrongQuestion.create({
            data: {
              childId: upload.childId,
              examUploadId: upload.id,
              subject: upload.subject,
              questionText: item.questionText,
              userAnswer: item.userAnswer,
              studentAnswer: item.userAnswer,
              correctAnswer: item.correctAnswer,
              analysis: item.analysis,
              errorReason: item.analysis,
              source: upload.id,
              knowledgePointId: primary?.id,
              knowledgePointText: primary?.name,
              answerText: item.correctAnswer,
              knowledgePoints: {
                create: linkedPoints.map((linked) => ({
                  knowledgePointId: linked.knowledgePoint.id,
                  confidence: linked.confidence,
                })),
              },
            },
            include: { knowledgePoints: { include: { knowledgePoint: true } } },
          });

          for (const linked of linkedPoints) {
            await tx.childKnowledgePoint.upsert({
              where: { childId_knowledgePointId: { childId: upload.childId, knowledgePointId: linked.knowledgePoint.id } },
              create: {
                childId: upload.childId,
                knowledgePointId: linked.knowledgePoint.id,
                knowledgePointText: linked.knowledgePoint.name,
                status: 'WEAK',
                masteryScore: 0,
                wrongCount: 1,
              },
              update: {
                status: 'WEAK',
                wrongCount: { increment: 1 },
              },
            });
          }
          createdWrongQuestions.push(toWrongQuestionRecord(wrong));
        }

          const doneUpload = await tx.examUpload.update({
            where: { id: uploadId },
            data: { status: 'DONE', resultJson: parsed.data as unknown as Prisma.JsonObject, processedAt: new Date() },
          });
          return { upload: toUploadRecord(doneUpload), wrongQuestions: createdWrongQuestions };
        });
      } catch (error) {
        if (!(error instanceof Error && error.message === 'AI 错题分析结果校验失败')) {
          await prisma.examUpload.update({ where: { id: uploadId }, data: { status: 'FAILED' } }).catch(() => undefined);
        }
        throw error;
      }
    }, () => processWithMemory(uploadId));
  },

  async listUploads(childId: string): Promise<ExamUploadRecord[]> {
    await assertChildOwnedByCurrentUser(childId);
    return withFallback(async () => {
      const uploads = await prisma.examUpload.findMany({ where: { childId }, orderBy: { createdAt: 'desc' } });
      return uploads.map(toUploadRecord);
    }, () => memoryState().uploads.filter((item) => item.childId === childId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  async listWrongQuestions(childId: string): Promise<WrongQuestionRecord[]> {
    await assertChildOwnedByCurrentUser(childId);
    return withFallback(async () => {
      const wrongQuestions = await prisma.wrongQuestion.findMany({
        where: { childId },
        orderBy: { createdAt: 'desc' },
        include: { knowledgePoints: { include: { knowledgePoint: true } } },
      });
      return wrongQuestions.map(toWrongQuestionRecord);
    }, () => memoryState().wrongQuestions.filter((item) => item.childId === childId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  getMemoryChildKnowledgePoint(childId: string, knowledgePointId: string) {
    return memoryState().childKnowledgePoints.find((item) => item.childId === childId && item.knowledgePointId === knowledgePointId) ?? null;
  },

  listMemoryChildKnowledgePoints(childId: string) {
    const state = memoryState();
    return state.childKnowledgePoints
      .filter((item) => item.childId === childId)
      .map((item) => {
        const point = state.knowledgePoints.find((kp) => kp.id === item.knowledgePointId);
        return {
          id: `${item.childId}:${item.knowledgePointId}`,
          childId: item.childId,
          knowledgePointId: item.knowledgePointId,
          knowledgePointText: point?.title ?? item.knowledgePointId,
          status: item.status,
          masteryScore: item.status === 'WEAK' ? 0 : item.status === 'PRACTICING' ? 60 : item.status === 'MASTERED' ? 90 : 0,
          wrongCount: item.wrongCount,
          practiceCount: item.practiceCount,
          correctCount: item.correctCount,
          lastPracticedAt: item.lastPracticedAt,
        };
      })
      .sort((a, b) => b.wrongCount - a.wrongCount || a.knowledgePointText.localeCompare(b.knowledgePointText, 'zh-Hans-CN'));
  },
};

export function resetExamUploadServiceForTest() {
  resetMemoryState();
}
