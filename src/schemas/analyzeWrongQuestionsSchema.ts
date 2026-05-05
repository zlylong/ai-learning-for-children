import { z } from 'zod';

export const analyzedKnowledgePointSchema = z.object({
  title: z.string().trim().min(1, '知识点名称不能为空'),
  confidence: z.number().min(0).max(1),
}).strict();

export const analyzedWrongQuestionSchema = z.object({
  questionText: z.string().trim().min(1, '题干不能为空'),
  userAnswer: z.string().trim().min(1, '学生答案不能为空'),
  correctAnswer: z.string().trim().min(1, '正确答案不能为空'),
  analysis: z.string().trim().min(1, '错误分析不能为空'),
  knowledgePoints: z.array(analyzedKnowledgePointSchema).min(1).max(3),
}).strict();

export const analyzeWrongQuestionsSchema = z.object({
  wrongQuestions: z.array(analyzedWrongQuestionSchema).min(1),
}).strict();

export type AnalyzeWrongQuestionsResult = z.infer<typeof analyzeWrongQuestionsSchema>;
export type AnalyzedWrongQuestion = z.infer<typeof analyzedWrongQuestionSchema>;
export type AnalyzedKnowledgePoint = z.infer<typeof analyzedKnowledgePointSchema>;
