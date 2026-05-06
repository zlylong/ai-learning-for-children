import { prisma } from '../lib/prisma';
import { aiClient } from '../ai/ai-client';
import { generateMonthlyWrongSetExamPrompt } from '../ai/prompts/generateMonthlyWrongSetExamPrompt';
import { generatedExamSchema } from '../schemas/generatedExamSchema';
import type { Prisma } from '@prisma/client';

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

export const examService = {
  async getMonthlyWrongQuestionSummary(input: {
    childId: string;
    subject: string;
    month: string; // YYYY-MM
  }): Promise<MonthlyWrongQuestionSummary> {
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

    // Aggregate by knowledge point
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

    // 1. Check child and ownership
    const child = await prisma.child.findFirst({
      where: { id: input.childId, userId: DEMO_USER_ID }
    });
    if (!child) throw new Error('孩子档案不存在或无权访问');

    // 2. Get summary
    const summary = await this.getMonthlyWrongQuestionSummary(input);

    // 3. Call AI
    const prompt = generateMonthlyWrongSetExamPrompt({
      grade: child.grade || '未知年级',
      subject: input.subject,
      textbookVersion: child.textbookVersion || '通用版本',
      month: input.month,
      wrongCount: summary.totalWrongQuestions,
      topKnowledgePoints: summary.topKnowledgePoints.map(kp => kp.title),
      summaryJson: summary,
    });

    const aiResponse = await aiClient.generateJson({
      prompt,
      // Metadata for tracking
      childId: input.childId,
      subject: input.subject,
      month: input.month,
    });

    const parsed = generatedExamSchema.safeParse(aiResponse);
    if (!parsed.success) {
      console.error('AI Response Validation Failed:', parsed.error);
      throw new Error('AI 生成试卷结果校验失败');
    }

    const exam = parsed.data;

    // 4. Create PracticeSession
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
            // Try to find knowledgePointId from summary if it matches title
            knowledgePointId: summary.topKnowledgePoints.find(kp => kp.title === q.knowledgePointTitle)?.knowledgePointId || null,
          }))
        }
      }
    });

    return { sessionId: session.id };
  }
};
