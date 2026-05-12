import { z } from 'zod';

export const learningSubjectCodeSchema = z.enum(['chinese', 'math', 'english']);
export const learningGradeCodeSchema = z.enum(['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09']);
export const learningPointSchemaVersion = 'learning-point-catalog/v1' as const;

export const learningPointSubjectSchema = z.object({
  code: learningSubjectCodeSchema,
  name: z.string().trim().min(1),
});

export const learningPointGradeSchema = z.object({
  code: learningGradeCodeSchema,
  name: z.string().trim().min(1),
});

export const learningPointMistakeSchema = z.object({
  type: z.string().trim().min(1),
  description: z.string().trim().min(1),
  remediation: z.string().trim().min(1),
});

export const learningPointExplanationSchema = z.object({
  why: z.string().trim().min(1),
  howToLearn: z.string().trim().min(1),
  steps: z.array(z.string().trim().min(1)).min(2),
});

export const learningPointExampleSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  analysis: z.string().trim().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
  type: z.enum(['single_choice', 'fill_blank', 'short_answer', 'calculation', 'word_problem', 'reading_comprehension', 'sentence_making']).default('short_answer'),
});

export const learningKnowledgePointSchema = z.object({
  id: z.string().trim().regex(/^kp_(chinese|math|english)_g0[1-9]_\d{3}_\d{3}$/),
  title: z.string().trim().min(1),
  order: z.number().int().positive(),
  level: z.enum(['foundation', 'core', 'advanced']).default('core'),
  status: z.enum(['active', 'deprecated']).default('active'),
  summary: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)).default([]),
  objectives: z.object({
    remember: z.array(z.string().trim().min(1)).min(1),
    understand: z.array(z.string().trim().min(1)).min(1),
    apply: z.array(z.string().trim().min(1)).min(1),
  }),
  keyConcepts: z.array(z.string().trim().min(1)).min(1),
  prerequisites: z.array(z.string().trim().min(1)).default([]),
  relatedPoints: z.array(z.string().trim().min(1)).default([]),
  commonMistakes: z.array(learningPointMistakeSchema).min(1),
  explanation: learningPointExplanationSchema,
  examples: z.array(learningPointExampleSchema).min(1),
  masteryCriteria: z.array(z.string().trim().min(1)).min(3),
  practiceProfile: z.object({
    recommendedQuestionTypes: z.array(z.enum(['single_choice', 'fill_blank', 'short_answer', 'calculation', 'word_problem', 'reading_comprehension', 'sentence_making'])).min(1),
    difficultyRange: z.array(z.enum(['easy', 'medium', 'hard'])).min(1),
    minCorrectRateForMastery: z.number().min(0).max(1),
  }),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export const learningPointChapterSchema = z.object({
  id: z.string().trim().regex(/^ch_(chinese|math|english)_g0[1-9]_\d{3}$/),
  title: z.string().trim().min(1),
  order: z.number().int().positive(),
  description: z.string().trim().optional(),
  knowledgePoints: z.array(learningKnowledgePointSchema).min(1),
});

export const learningPointCatalogSchema = z.object({
  schemaVersion: z.literal(learningPointSchemaVersion),
  catalogVersion: z.string().trim().min(1),
  subject: learningPointSubjectSchema,
  grade: learningPointGradeSchema,
  semester: z.union([z.literal('1'), z.literal('2'), z.literal('all')]).default('all'),
  textbook: z.object({
    version: z.string().trim().min(1),
    name: z.string().trim().min(1),
    publisher: z.string().trim().nullable().default(null),
  }),
  generatedBy: z.object({
    agent: z.literal('learning'),
    promptVersion: z.string().trim().min(1),
  }),
  chapters: z.array(learningPointChapterSchema).min(1),
  updatedAt: z.string().datetime(),
});

export const learningPointManifestSchema = z.object({
  schemaVersion: z.literal(learningPointSchemaVersion),
  catalogVersion: z.string().trim().min(1),
  generatedBy: z.object({
    agent: z.literal('learning'),
    promptVersion: z.string().trim().min(1),
  }),
  locale: z.literal('zh-CN'),
  gradeRange: z.array(learningGradeCodeSchema).min(1),
  subjects: z.array(learningPointSubjectSchema).min(1),
  files: z.array(z.object({
    grade: learningGradeCodeSchema,
    subject: learningSubjectCodeSchema,
    version: z.string().trim().min(1),
    path: z.string().trim().min(1),
  })).min(1),
  updatedAt: z.string().datetime(),
});

export type LearningSubjectCode = z.infer<typeof learningSubjectCodeSchema>;
export type LearningGradeCode = z.infer<typeof learningGradeCodeSchema>;
export type LearningPointCatalog = z.infer<typeof learningPointCatalogSchema>;
export type LearningKnowledgePoint = z.infer<typeof learningKnowledgePointSchema>;
export type LearningPointManifest = z.infer<typeof learningPointManifestSchema>;
