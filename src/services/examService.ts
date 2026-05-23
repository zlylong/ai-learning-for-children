import { prisma } from '../lib/prisma';
import { aiClient } from '../ai/ai-client';
import { generateMonthlyWrongSetExamPrompt } from '../ai/prompts/generateMonthlyWrongSetExamPrompt';
import { generatedExamSchema } from '../schemas/generatedExamSchema';
import type { Prisma } from '@prisma/client';
import { loadLearningPointCatalog } from '../features/learning-points/loader';
import { shouldUseMemoryStore } from '../lib/with-fallback';
import { childService } from '../features/children/service';
import { practiceService } from './practiceService';

export interface MonthlyWrongQuestionSummary {
  totalWrongQuestions: number;
  topKnowledgePoints: {
    title: string;
    wrongCount: number;
    knowledgePointId: string | null;
  }[];
  sampleQuestions: {
    questionText: string;
    knowledgePointTitle: string;
  }[];
}

const DEMO_USER_ID = 'demo-user';

function memoryMockSummary(input: { childId: string; subject: string; month: string }): MonthlyWrongQuestionSummary {
  return {
    totalWrongQuestions: 5,
    topKnowledgePoints: [
      { title: '两位数加法进位', wrongCount: 2, knowledgePointId: null },
      { title: '阅读理解-内容概括', wrongCount: 2, knowledgePointId: null },
      { title: '图形周长计算', wrongCount: 1, knowledgePointId: null },
    ],
    sampleQuestions: [
      { questionText: '计算：36 + 27 = ?', knowledgePointTitle: '两位数加法进位' },
      { questionText: '请概括短文主要内容。', knowledgePointTitle: '阅读理解-内容概括' },
    ],
  };
}

export const examService = {
  async getMonthlyWrongQuestionSummary(input: {
    childId: string;
    subject: string;
    month: string; // YYYY-MM
  }): Promise<MonthlyWrongQuestionSummary> {
    if (shouldUseMemoryStore()) return memoryMockSummary(input);

    const startDate = new Date(`${input.month}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const wrongQuestions = await prisma.wrongQuestion.findMany({
      where: {
        childId: input.childId,
        subject: input.subject,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        knowledgePoint: true,
      },
    });

    if (wrongQuestions.length === 0) {
      throw new Error('该月没有错题，无法生成复习卷');
    }

    const kpMap = new Map<string, { title: string; count: number; id: string | null }>();
    for (const wq of wrongQuestions) {
      const kpTitle = wq.knowledgePoint?.name || wq.knowledgePointText || '未分类知识点';
      const kpId = wq.knowledgePointId;
      const key = kpId || kpTitle;
      const existing = kpMap.get(key) || { title: kpTitle, count: 0, id: kpId };
      existing.count += 1;
      kpMap.set(key, existing);
    }

    const sortedKps = Array.from(kpMap.values()).sort((a, b) => b.count - a.count);
    
    return {
      totalWrongQuestions: wrongQuestions.length,
      topKnowledgePoints: sortedKps.map(kp => ({
        title: kp.title,
        wrongCount: kp.count,
        knowledgePointId: kp.id
      })),
      sampleQuestions: wrongQuestions.slice(0, 10).map(wq => ({
        questionText: wq.questionText,
        knowledgePointTitle: wq.knowledgePoint?.name || wq.knowledgePointText || '未分类'
      })),
    };
  },

  async getMonthlyExamPreview(input: {
    childId: string;
    subject: string;
    month: string;
  }) {
    const summary = await this.getMonthlyWrongQuestionSummary(input);
    return {
      wrongQuestionCount: summary.totalWrongQuestions,
      topKnowledgePoints: summary.topKnowledgePoints.slice(0, 5).map(kp => ({
        title: kp.title,
        wrongCount: kp.wrongCount,
      })),
      suggestedQuestionCount: 20,
    };
  },

  async generateMonthlyWrongSetExam(input: {
    childId: string;
    subject: string;
    month: string;
    questionCount?: number;
  }) {
    const questionCount = input.questionCount || 20;

    const child = shouldUseMemoryStore()
      ? await childService.get(input.childId)
      : await prisma.child.findFirst({ where: { id: input.childId, userId: DEMO_USER_ID } });
    if (!child) throw new Error('孩子档案不存在或无权访问');

    const summary = await this.getMonthlyWrongQuestionSummary(input);

    const catalog = await loadLearningPointCatalog({ grade: child.grade || 'G03', subject: input.subject, version: child.textbookVersion || null }).catch(() => null);
    const learningPoints = catalog?.chapters.flatMap((chapter) => chapter.knowledgePoints).filter((point) =>
      summary.topKnowledgePoints.some((kp) => kp.title === point.title || kp.title.includes(point.title) || point.title.includes(kp.title))
    ).slice(0, 10) ?? [];

    const prompt = await generateMonthlyWrongSetExamPrompt({
      grade: child.grade || '未知年级',
      subject: input.subject,
      textbookVersion: child.textbookVersion || '通用版本',
      month: input.month,
      wrongCount: summary.totalWrongQuestions,
      topKnowledgePoints: summary.topKnowledgePoints.map(kp => kp.title),
      summaryJson: summary,
      learningPoints,
    });

    const aiResponse = await aiClient.generateJson({
      task: 'monthly-exam',
      prompt,
      childId: input.childId,
      subject: input.subject,
      month: input.month,
    });

    const parsed = generatedExamSchema.safeParse(aiResponse.result);
    if (!parsed.success) {
      console.error('AI Response Validation Failed:', parsed.error);
      throw new Error('AI 生成试卷结果校验失败');
    }

    const exam = parsed.data;

    if (shouldUseMemoryStore()) {
      return practiceService.createDirectMemorySession({
        childId: input.childId,
        subject: input.subject,
        month: input.month,
        exam,
        questionCount,
      });
    }

    const session = await prisma.practiceSession.create({
      data: {
        childId: input.childId,
        type: 'MONTHLY_WRONG_SET',
        title: exam.title,
        subject: input.subject,
        sourceMonth: input.month,
        summaryJson: summary as unknown as Prisma.InputJsonValue,
        questionCount: Math.min(exam.questions.length, questionCount),
        status: 'ACTIVE',
        questions: {
          create: exam.questions.slice(0, questionCount).map((q, index) => ({
            order: index + 1,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options,
            answer: q.answer,
            answerText: q.answer,
            explanation: q.explanation,
            analysis: q.explanation,
            knowledgePointText: q.knowledgePointTitle,
            knowledgePointId: summary.topKnowledgePoints.find(kp => kp.title === q.knowledgePointTitle)?.knowledgePointId || null,
          }))
        }
      }
    });

    return { sessionId: session.id };
  }
};
