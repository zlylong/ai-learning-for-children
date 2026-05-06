import { z } from 'zod';

export const aiProviderSchema = z.enum(['mock', 'openai-compatible']);
export const aiTaskSchema = z.enum(['exam-analysis', 'practice-generation', 'monthly-exam', 'ocr', 'audio', 'text']);

export const DEFAULT_OPENAI_BASE_URL = 'https://api.deepseek.com/v1';
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

const optionalModelSchema = z.string().trim().max(120).optional().or(z.literal('')).transform((value) => value || undefined);

export const aiTaskModelsSchema = z.object({
  text: optionalModelSchema,
  ocr: optionalModelSchema,
  audio: optionalModelSchema,
  examAnalysis: optionalModelSchema,
  practiceGeneration: optionalModelSchema,
  monthlyExam: optionalModelSchema,
}).optional().default({
  text: DEFAULT_DEEPSEEK_MODEL,
  ocr: undefined,
  audio: undefined,
  examAnalysis: undefined,
  practiceGeneration: undefined,
  monthlyExam: undefined,
});

export const aiSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  provider: aiProviderSchema.default('mock'),
  baseUrl: z.string().trim().url('请输入合法的 Base URL').optional().or(z.literal('')).transform((value) => value || DEFAULT_OPENAI_BASE_URL),
  model: optionalModelSchema.default(DEFAULT_DEEPSEEK_MODEL),
  models: aiTaskModelsSchema,
  apiKey: z.string().trim().max(4000).optional().or(z.literal('')).transform((value) => value || undefined),
  timeoutMs: z.number().int().min(3000).max(120000).default(30000),
}).superRefine((value, ctx) => {
  if (value.provider === 'openai-compatible' && value.enabled) {
    if (!value.baseUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['baseUrl'], message: '启用真实 AI 时必须填写 Base URL' });
    }
    const hasAnyModel = Boolean(value.model || value.models.text || value.models.ocr || value.models.audio || value.models.examAnalysis || value.models.practiceGeneration || value.models.monthlyExam);
    if (!hasAnyModel) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['model'], message: '启用真实 AI 时至少填写默认模型或一个业务模型' });
    }
  }
});

export const aiSettingsUpdateSchema = aiSettingsSchema.extend({
  keepExistingApiKey: z.boolean().optional().default(false),
});

export const aiSettingsPublicSchema = z.object({
  enabled: z.boolean(),
  provider: aiProviderSchema,
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  models: z.object({
    text: z.string().optional(),
    ocr: z.string().optional(),
    audio: z.string().optional(),
    examAnalysis: z.string().optional(),
    practiceGeneration: z.string().optional(),
    monthlyExam: z.string().optional(),
  }),
  timeoutMs: z.number().int(),
  hasApiKey: z.boolean(),
  apiKeyMask: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiTask = z.infer<typeof aiTaskSchema>;
export type AiTaskModels = z.infer<typeof aiTaskModelsSchema>;
export type AiSettings = z.infer<typeof aiSettingsSchema> & { updatedAt?: string };
export type AiSettingsUpdate = z.infer<typeof aiSettingsUpdateSchema>;
export type AiSettingsPublic = z.infer<typeof aiSettingsPublicSchema>;
