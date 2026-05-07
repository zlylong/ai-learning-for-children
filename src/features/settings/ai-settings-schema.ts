import { z } from 'zod';

export const aiProviderSchema = z.enum(['mock', 'openai-compatible']);
export const aiTaskSchema = z.enum(['exam-analysis', 'practice-generation', 'monthly-exam', 'ocr', 'audio', 'text']);

export const AI_TASKS = ['exam-analysis', 'practice-generation', 'monthly-exam', 'ocr', 'audio', 'text'] as const;
export const DEFAULT_PROFILE_ID = 'default-text';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.deepseek.com/v1';
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

const optionalStringSchema = z.string().trim().max(4000).optional().or(z.literal('')).transform((value) => value || undefined);
const optionalModelSchema = z.string().trim().max(120).optional().or(z.literal('')).transform((value) => value || undefined);
const profileIdSchema = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, '模型档案 ID 只能包含字母、数字、下划线和横线');

const aiProfileObjectSchema = z.object({
  id: profileIdSchema,
  name: z.string().trim().min(1, '请输入档案名称').max(80),
  enabled: z.boolean().default(true),
  provider: aiProviderSchema.default('mock'),
  baseUrl: z.string().trim().url('请输入合法的 Base URL').optional().or(z.literal('')).transform((value) => value || undefined),
  model: optionalModelSchema,
  apiKey: optionalStringSchema,
  timeoutMs: z.number().int().min(3000).max(120000).default(30000),
});

export const aiProfileSchema = aiProfileObjectSchema.superRefine((value, ctx) => {
  if (value.enabled && value.provider === 'openai-compatible') {
    if (!value.baseUrl) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['baseUrl'], message: 'OpenAI 兼容档案必须填写 Base URL' });
    if (!value.model) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['model'], message: 'OpenAI 兼容档案必须填写模型名' });
  }
});

const taskRoutesBaseSchema = z.object({
  'exam-analysis': profileIdSchema.optional(),
  'practice-generation': profileIdSchema.optional(),
  'monthly-exam': profileIdSchema.optional(),
  ocr: profileIdSchema.optional(),
  audio: profileIdSchema.optional(),
  text: profileIdSchema.optional(),
});

export const aiTaskRoutesSchema = taskRoutesBaseSchema.transform((value) => ({
  'exam-analysis': value['exam-analysis'],
  'practice-generation': value['practice-generation'],
  'monthly-exam': value['monthly-exam'],
  ocr: value.ocr,
  audio: value.audio,
  text: value.text,
}));

function legacyDefaultProfile(input: { enabled?: boolean; provider?: unknown; baseUrl?: unknown; model?: unknown; apiKey?: unknown; timeoutMs?: unknown }) {
  const provider = input.provider === 'openai-compatible' ? 'openai-compatible' : 'mock';
  const model = typeof input.model === 'string' && input.model.trim() ? input.model.trim() : DEFAULT_DEEPSEEK_MODEL;
  const baseUrl = typeof input.baseUrl === 'string' && input.baseUrl.trim() ? input.baseUrl.trim() : DEFAULT_OPENAI_BASE_URL;
  const apiKey = typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey.trim() : undefined;
  const timeoutMs = typeof input.timeoutMs === 'number' ? input.timeoutMs : 30000;
  return { id: DEFAULT_PROFILE_ID, name: provider === 'mock' ? 'Mock 默认档案' : '默认文本模型', enabled: input.enabled ?? false, provider, baseUrl: provider === 'openai-compatible' ? baseUrl : undefined, model: provider === 'openai-compatible' ? model : 'mock', apiKey, timeoutMs };
}

function normalizeRawSettings(raw: unknown): Record<string, unknown> {
  const value = (raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {}) as Record<string, unknown>;
  const profiles = Array.isArray(value.profiles) && value.profiles.length > 0 ? value.profiles : [legacyDefaultProfile(value)];
  const defaultProfile = (profiles[0] as { id?: unknown } | undefined)?.id;
  const defaultProfileId = typeof defaultProfile === 'string' && defaultProfile.trim() ? defaultProfile.trim() : DEFAULT_PROFILE_ID;
  const taskRoutes = value.taskRoutes && typeof value.taskRoutes === 'object' ? value.taskRoutes : {};
  value.profiles = profiles;
  value.taskRoutes = { text: defaultProfileId, 'exam-analysis': defaultProfileId, 'practice-generation': defaultProfileId, 'monthly-exam': defaultProfileId, ...(taskRoutes as Record<string, unknown>) };
  value.enabled = typeof value.enabled === 'boolean' ? value.enabled : false;
  value.provider = value.provider === 'openai-compatible' ? 'openai-compatible' : 'mock';
  value.baseUrl = typeof value.baseUrl === 'string' && value.baseUrl.trim() ? value.baseUrl : DEFAULT_OPENAI_BASE_URL;
  value.model = typeof value.model === 'string' && value.model.trim() ? value.model : DEFAULT_DEEPSEEK_MODEL;
  value.timeoutMs = typeof value.timeoutMs === 'number' ? value.timeoutMs : 30000;
  return value;
}

const aiSettingsObjectSchema = z.object({
  enabled: z.boolean().default(false),
  provider: aiProviderSchema.default('mock'),
  baseUrl: z.string().trim().url().optional().or(z.literal('')).transform((value) => value || DEFAULT_OPENAI_BASE_URL),
  model: optionalModelSchema.default(DEFAULT_DEEPSEEK_MODEL),
  profiles: z.array(aiProfileSchema).min(1).max(12),
  taskRoutes: aiTaskRoutesSchema,
  apiKey: optionalStringSchema,
  timeoutMs: z.number().int().min(3000).max(120000).default(30000),
});

function validateProfileRoutes(value: z.infer<typeof aiSettingsObjectSchema>, ctx: z.RefinementCtx) {
  const ids = new Set<string>();
  for (const [index, profile] of value.profiles.entries()) {
    if (ids.has(profile.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['profiles', index, 'id'], message: '模型档案 ID 不能重复' });
    ids.add(profile.id);
  }
  for (const task of AI_TASKS) {
    const profileId = value.taskRoutes[task];
    if (profileId && !ids.has(profileId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['taskRoutes', task], message: `功能 ${task} 绑定了不存在的模型档案` });
  }
}

export const aiSettingsSchema = z.preprocess(normalizeRawSettings, aiSettingsObjectSchema).superRefine(validateProfileRoutes);
export const aiSettingsUpdateSchema = z.preprocess(normalizeRawSettings, aiSettingsObjectSchema.extend({
  keepExistingApiKey: z.boolean().optional().default(false),
  keepExistingApiKeys: z.record(z.string(), z.boolean()).optional().default({}),
})).superRefine(validateProfileRoutes);

export const aiProfilePublicSchema = aiProfileObjectSchema.omit({ apiKey: true }).extend({ hasApiKey: z.boolean(), apiKeyMask: z.string().optional() });
export const aiSettingsPublicSchema = z.object({
  enabled: z.boolean(),
  provider: aiProviderSchema,
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  profiles: z.array(aiProfilePublicSchema),
  taskRoutes: aiTaskRoutesSchema,
  timeoutMs: z.number().int(),
  hasApiKey: z.boolean(),
  apiKeyMask: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiTask = z.infer<typeof aiTaskSchema>;
export type AiProfile = z.infer<typeof aiProfileSchema>;
export type AiTaskRoutes = z.infer<typeof aiTaskRoutesSchema>;
export type AiSettings = z.infer<typeof aiSettingsSchema> & { updatedAt?: string };
export type AiSettingsUpdate = z.infer<typeof aiSettingsUpdateSchema>;
export type AiSettingsPublic = z.infer<typeof aiSettingsPublicSchema>;
export type AiProfilePublic = z.infer<typeof aiProfilePublicSchema>;
