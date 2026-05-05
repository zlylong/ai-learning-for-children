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


export const practiceDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
export const practiceQuestionTypeSchema = z.enum(['CHOICE', 'FILL_BLANK', 'JUDGEMENT']);

export const practiceGenerationInputSchema = z.object({
  childId: z.string().min(1),
  knowledgePoint: z.string().trim().min(1),
  questionCount: z.number().int().min(1).max(10),
  difficulty: practiceDifficultySchema,
  questionType: practiceQuestionTypeSchema,
});

export const practiceQuestionAiSchema = z.object({
  stem: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).max(6).optional().default([]),
  answerText: z.string().trim().min(1),
  analysis: z.string().trim().min(1),
  knowledgePoint: z.string().trim().min(1),
});

export const practiceGenerationOutputSchema = z.object({
  questions: z.array(practiceQuestionAiSchema).min(1).max(10),
});

export type PracticeGenerationInput = z.infer<typeof practiceGenerationInputSchema>;
export type PracticeGenerationOutput = z.infer<typeof practiceGenerationOutputSchema>;
export type PracticeQuestionAi = z.infer<typeof practiceQuestionAiSchema>;

export async function generatePracticeWithAi(input: PracticeGenerationInput): Promise<PracticeGenerationOutput> {
  const parsedInput = practiceGenerationInputSchema.parse(input);
  const rawOutput = await mockGeneratePractice(parsedInput);
  return practiceGenerationOutputSchema.parse(rawOutput);
}

async function mockGeneratePractice(input: PracticeGenerationInput): Promise<unknown> {
  const baseNumber = input.difficulty === 'EASY' ? 20 : input.difficulty === 'MEDIUM' ? 40 : 70;
  const questions = Array.from({ length: input.questionCount }, (_, index) => {
    const left = baseNumber + index + 6;
    const right = input.difficulty === 'HARD' ? 28 + index : 17 + index;
    const answer = String(left + right);
    if (input.questionType === 'JUDGEMENT') {
      const displayed = index % 2 === 0 ? answer : String(left + right + 1);
      return {
        stem: `判断：${left} + ${right} = ${displayed}`,
        options: ['正确', '错误'],
        answerText: displayed === answer ? '正确' : '错误',
        analysis: `先算个位再处理进位，${left} + ${right} = ${answer}。`,
        knowledgePoint: input.knowledgePoint,
      };
    }
    if (input.questionType === 'CHOICE') {
      return {
        stem: `${input.knowledgePoint} 练习：${left} + ${right} = ?`,
        options: [String(left + right - 1), answer, String(left + right + 2), String(left + right + 10)],
        answerText: answer,
        analysis: `个位相加满十向十位进 1，正确答案是 ${answer}。`,
        knowledgePoint: input.knowledgePoint,
      };
    }
    return {
      stem: `${input.knowledgePoint} 填空：${left} + ${right} = ____`,
      options: [],
      answerText: answer,
      analysis: `拆分计算：${left} + ${right} = ${answer}，注意进位。`,
      knowledgePoint: input.knowledgePoint,
    };
  });
  return { questions };
}
