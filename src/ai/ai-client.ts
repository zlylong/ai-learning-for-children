import { z } from 'zod';
import { aiSettingsService } from '@/features/settings/ai-settings-service';
import type { AiSettings, AiTask } from '@/features/settings/ai-settings-schema';

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

export type GenerateJsonInput = {
  prompt: string;
  task?: AiTask;
  subject?: string;
  rawText?: string;
  knowledgePointTitle?: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionType?: 'single_choice' | 'fill_blank' | 'short_answer';
  childId?: string;
  month?: string;
};

export const aiClient = {
  generateJson,
};

export async function generateJson(input: GenerateJsonInput): Promise<unknown> {
  const settings = await aiSettingsService.getRuntimeSettings().catch(() => undefined);
  if (settings?.enabled && settings.provider === 'openai-compatible') {
    return generateJsonWithOpenAiCompatible(input, settings);
  }
  return mockGenerateJson(input);
}

function resolveModelForTask(settings: AiSettings, task?: AiTask): string | undefined {
  if (task === 'ocr') return settings.models?.ocr || settings.models?.text || settings.model;
  if (task === 'audio') return settings.models?.audio || settings.models?.text || settings.model;
  if (task === 'text') return settings.models?.text || settings.model;
  if (task === 'exam-analysis') return settings.models?.examAnalysis || settings.models?.text || settings.model;
  if (task === 'practice-generation') return settings.models?.practiceGeneration || settings.models?.text || settings.model;
  if (task === 'monthly-exam') return settings.models?.monthlyExam || settings.models?.text || settings.model;
  return settings.model || settings.models?.text || settings.models?.examAnalysis || settings.models?.practiceGeneration || settings.models?.monthlyExam || settings.models?.ocr || settings.models?.audio;
}

async function generateJsonWithOpenAiCompatible(input: GenerateJsonInput, settings: AiSettings): Promise<unknown> {
  const model = resolveModelForTask(settings, input.task);
  if (!settings.baseUrl || !model || !settings.apiKey) {
    throw new Error(`真实 AI 已启用，但 ${input.task ? '当前业务模型' : '模型'}、Base URL 或 API Key 未配置完整`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
  try {
    const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '你是面向儿童学习诊断系统的 JSON 生成器。必须只返回合法 JSON，不要输出 Markdown。' },
          { role: 'user', content: input.prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI 服务调用失败：HTTP ${response.status}`);
    }

    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> };
    const content = payload.choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.map((item) => item.text ?? '').join('') : content;
    if (!text) {
      throw new Error('AI 服务返回空内容');
    }
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('AI 服务返回内容不是合法 JSON');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function mockGenerateJson(input: GenerateJsonInput): Promise<unknown> {
  if (input.task === 'monthly-exam' || input.prompt.includes('错题复习卷') || input.month) {
    return mockGenerateMonthlyExamJson(input);
  }

  if (input.task === 'practice-generation' || input.knowledgePointTitle || input.prompt.includes('练习题')) {
    return mockGeneratePracticeQuestionsJson(input);
  }

  const rawText = input.rawText ?? input.prompt;
  if (rawText.includes('INVALID_AI_OUTPUT')) {
    return { wrongQuestions: [{ questionText: '缺少必要字段' }] };
  }

  const firstLine = rawText.split(/\n+/).find(Boolean)?.slice(0, 80) ?? '计算：36 + 27 = ?';
  return {
    wrongQuestions: [
      {
        questionText: firstLine.includes('?') || firstLine.includes('？') ? firstLine : '计算：36 + 27 = ?',
        userAnswer: '62',
        correctAnswer: '63',
        analysis: '进位计算遗漏，个位相加满十后需要向十位进 1。',
        knowledgePoints: [{ title: '两位数加法进位', confidence: 0.92 }],
      },
      {
        questionText: '阅读题：请概括短文主要内容。',
        userAnswer: '写了小朋友去公园。',
        correctAnswer: '应包含人物、地点、事件和结果四个要素。',
        analysis: '概括信息不完整，缺少事件结果。',
        knowledgePoints: [{ title: '阅读理解-内容概括', confidence: 0.86 }],
      },
    ],
  };
}

function mockGeneratePracticeQuestionsJson(input: GenerateJsonInput): unknown {
  const knowledgePointTitle = input.knowledgePointTitle ?? '两位数加法进位';
  if (knowledgePointTitle.includes('INVALID_AI_OUTPUT') || input.prompt.includes('INVALID_AI_OUTPUT')) {
    return { questions: [{ questionText: '缺少答案', questionType: 'single_choice', options: ['A', 'B'] }] };
  }

  const count = Math.min(30, Math.max(1, input.questionCount ?? 5));
  const difficulty = input.difficulty ?? 'medium';
  const questionType = input.questionType ?? 'single_choice';
  const baseNumber = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 40 : 70;
  return {
    questions: Array.from({ length: count }, (_, index) => {
      const left = baseNumber + index + 6;
      const right = difficulty === 'hard' ? 28 + index : 17 + index;
      const answer = String(left + right);
      if (questionType === 'single_choice') {
        return {
          questionText: `${knowledgePointTitle}：${left} + ${right} = ?`,
          questionType,
          options: [String(left + right - 1), answer, String(left + right + 2), String(left + right + 10)],
          answer,
          explanation: `个位相加满十向十位进 1，正确答案是 ${answer}。`,
          knowledgePointTitle,
          difficulty,
        };
      }
      return {
        questionText: questionType === 'fill_blank' ? `${knowledgePointTitle}：${left} + ${right} = ____` : `请说明 ${left} + ${right} 的计算过程。`,
        questionType,
        options: [],
        answer,
        explanation: `拆分计算：${left} + ${right} = ${answer}，注意进位。`,
        knowledgePointTitle,
        difficulty,
      };
    }),
  };
}

function mockGenerateMonthlyExamJson(input: GenerateJsonInput): unknown {
  const month = input.month || '2026-05';
  const count = 20;
  const kps = ['两位数加法进位', '阅读理解-内容概括', '图形周长计算'];

  return {
    title: `${month}错题复习卷`,
    questions: Array.from({ length: count }, (_, index) => {
      const kp = kps[index % kps.length];
      const left = 20 + index;
      const right = 15 + index;
      const answer = String(left + right);
      return {
        questionText: `${kp}复习题：${left} + ${right} = ?`,
        questionType: 'single_choice',
        options: [String(left + right - 1), answer, String(left + right + 2), String(left + right + 5)],
        answer,
        explanation: `这是针对${kp}的改编练习。计算结果为 ${answer}。`,
        knowledgePointTitle: kp,
        difficulty: 'medium'
      };
    })
  };
}

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
