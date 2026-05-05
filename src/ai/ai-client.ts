import { z } from 'zod';

export const examAnalysisInputSchema = z.object({
  childId: z.string().min(1),
  text: z.string().trim().optional().default(''),
  imageCount: z.number().int().min(0).max(9).optional().default(0),
});

export const examWrongQuestionSchema = z.object({
  questionText: z.string().trim().min(1),
  studentAnswer: z.string().trim().min(1),
  correctAnswer: z.string().trim().min(1),
  errorReason: z.string().trim().min(1),
  knowledgePoint: z.string().trim().min(1),
});

export const examAnalysisOutputSchema = z.object({
  summary: z.string().trim().min(1),
  wrongQuestions: z.array(examWrongQuestionSchema).min(1),
});

export type ExamAnalysisInput = z.infer<typeof examAnalysisInputSchema>;
export type ExamAnalysisOutput = z.infer<typeof examAnalysisOutputSchema>;
export type ExamWrongQuestion = z.infer<typeof examWrongQuestionSchema>;

export async function analyzeExamWithAi(input: ExamAnalysisInput): Promise<ExamAnalysisOutput> {
  const parsedInput = examAnalysisInputSchema.parse(input);
  const rawOutput = await mockAnalyzeExam(parsedInput);
  return examAnalysisOutputSchema.parse(rawOutput);
}

async function mockAnalyzeExam(input: ExamAnalysisInput): Promise<unknown> {
  const source = input.text || (input.imageCount > 0 ? 'OCR mock：图片中识别到数学、语文混合错题。' : '未提供试卷文本');
  const firstLine = source.split(/\n+/).find(Boolean)?.slice(0, 80) ?? '试卷题目';

  return {
    summary: `Mock AI 已分析：基于${input.text ? '粘贴文本' : '图片 OCR mock'}生成错题诊断。`,
    wrongQuestions: [
      {
        questionText: firstLine.includes('=') ? firstLine : '计算：36 + 27 = ?',
        studentAnswer: '62',
        correctAnswer: '63',
        errorReason: '进位计算遗漏，个位相加后没有正确向十位进 1。',
        knowledgePoint: '两位数加法进位',
      },
      {
        questionText: '阅读题：请概括短文主要内容。',
        studentAnswer: '写了小朋友去公园。',
        correctAnswer: '应包含人物、地点、事件和结果四个要素。',
        errorReason: '概括信息不完整，缺少事件结果。',
        knowledgePoint: '阅读理解-内容概括',
      },
    ],
  };
}
