import { z } from 'zod';

export const aiProviderSchema = z.enum(['mock', 'openai-compatible']);

export const aiSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  provider: aiProviderSchema.default('mock'),
  baseUrl: z.string().trim().url('请输入合法的 Base URL').optional().or(z.literal('')).transform((value) => value || undefined),
  model: z.string().trim().max(120).optional().or(z.literal('')).transform((value) => value || undefined),
  apiKey: z.string().trim().max(4000).optional().or(z.literal('')).transform((value) => value || undefined),
  timeoutMs: z.number().int().min(3000).max(120000).default(30000),
}).superRefine((value, ctx) => {
  if (value.provider === 'openai-compatible' && value.enabled) {
    if (!value.baseUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['baseUrl'], message: '启用真实 AI 时必须填写 Base URL' });
    }
    if (!value.model) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['model'], message: '启用真实 AI 时必须填写模型名称' });
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
  timeoutMs: z.number().int(),
  hasApiKey: z.boolean(),
  apiKeyMask: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiSettings = z.infer<typeof aiSettingsSchema> & { updatedAt?: string };
export type AiSettingsUpdate = z.infer<typeof aiSettingsUpdateSchema>;
export type AiSettingsPublic = z.infer<typeof aiSettingsPublicSchema>;
