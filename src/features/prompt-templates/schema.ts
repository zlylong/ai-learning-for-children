import { z } from 'zod';

export const promptTemplateSchemaVersion = 'prompt-template-pack/v1' as const;
export const promptTemplateIdSchema = z.enum([
  'analyze-wrong-questions',
  'generate-practice-questions',
  'generate-monthly-wrong-set-exam',
]);

export const promptVariableSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  required: z.boolean().default(true),
});

export const promptLearningPointModeSchema = z.object({
  enabled: z.boolean().default(true),
  maxPoints: z.number().int().min(1).max(20).default(5),
  includeFields: z.array(z.enum([
    'title',
    'summary',
    'objectives',
    'keyConcepts',
    'commonMistakes',
    'explanation',
    'examples',
    'masteryCriteria',
    'practiceProfile',
    'teachingTags',
  ])).default(['title', 'summary', 'keyConcepts', 'commonMistakes', 'examples']),
  fallbackInstruction: z.string().trim().min(1).default('如果没有匹配的 Learning Points，请先使用“待确认知识点”兜底，并避免编造教材外知识点 ID。'),
});

export const promptTemplateSchema = z.object({
  id: promptTemplateIdSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  task: z.string().trim().min(1),
  systemRole: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  variables: z.array(promptVariableSchema).default([]),
  learningPointMode: promptLearningPointModeSchema.optional().default({
    enabled: true,
    maxPoints: 5,
    includeFields: ['title', 'summary', 'keyConcepts', 'commonMistakes', 'examples'],
    fallbackInstruction: '如果没有匹配的 Learning Points，请先使用“待确认知识点”兜底，并避免编造教材外知识点 ID。',
  }),
  rules: z.array(z.string().trim().min(1)).min(1),
  outputContract: z.string().trim().min(1),
});

export const promptTemplatePackSchema = z.object({
  schemaVersion: z.literal(promptTemplateSchemaVersion),
  packVersion: z.string().trim().min(1),
  locale: z.literal('zh-CN').default('zh-CN'),
  templates: z.array(promptTemplateSchema).min(1),
  updatedAt: z.string().datetime(),
});

export type PromptTemplateId = z.infer<typeof promptTemplateIdSchema>;
export type PromptTemplate = z.infer<typeof promptTemplateSchema>;
export type PromptTemplatePack = z.infer<typeof promptTemplatePackSchema>;
export type PromptLearningPointMode = z.infer<typeof promptLearningPointModeSchema>;
