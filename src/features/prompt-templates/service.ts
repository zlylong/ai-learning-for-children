import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { promptTemplateIdSchema, promptTemplatePackSchema, promptTemplateSchemaVersion, type PromptLearningPointMode, type PromptTemplate, type PromptTemplateId, type PromptTemplatePack } from './schema';
import type { LearningKnowledgePoint } from '@/features/learning-points/schema';

const promptRoot = path.join(process.cwd(), 'data', 'prompt-templates');
const activePackPath = path.join(promptRoot, 'active.json');

export const promptTemplatePackUploadSchema = z.object({
  pack: promptTemplatePackSchema,
  replace: z.boolean().default(true),
});

export type PromptRenderContext = {
  variables: Record<string, unknown>;
  learningPoints?: LearningKnowledgePoint[];
};

export type PromptTemplateSummary = {
  id: PromptTemplateId;
  name: string;
  description: string;
  task: string;
  learningPointMode: PromptLearningPointMode;
};

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'analyze-wrong-questions',
    name: '错题诊断与 Learning Points 归因',
    description: '从试卷文本中提取错题、错误原因，并映射到可运营 Learning Points。',
    task: 'exam-analysis',
    systemRole: '你是面向小学生的 AI 学习诊断老师，也是 Learning Points 内容运营助手。',
    objective: '从试卷结果中提取错题，分析错误原因，并把每道错题关联到最合适的 Learning Points。',
    variables: [
      { name: 'subject', description: '学科', required: true },
      { name: 'rawText', description: '试卷原始文本', required: true },
    ],
    learningPointMode: {
      enabled: true,
      maxPoints: 8,
      includeFields: ['title', 'summary', 'keyConcepts', 'commonMistakes', 'examples', 'teachingTags'],
      fallbackInstruction: '优先从提供的 Learning Points 中选择 title；无法确定时 title 使用“待确认知识点”，confidence 使用 0.3。',
    },
    rules: [
      '只返回严格 JSON，不要输出 Markdown。',
      'knowledgePoints 最多 3 个，按相关度从高到低排序。',
      'confidence 必须是 0 到 1 的数字。',
      '错误原因要儿童可理解，并指出可执行的订正方向。',
      '不要编造 Learning Point；优先使用上下文里的 title 或 fallbackInstruction。',
    ],
    outputContract: `{
  "wrongQuestions": [
    {
      "questionText": "...",
      "userAnswer": "...",
      "correctAnswer": "...",
      "analysis": "...",
      "knowledgePoints": [{ "title": "...", "confidence": 0.9 }]
    }
  ]
}`,
  },
  {
    id: 'generate-practice-questions',
    name: 'Learning Point 专项练习生成',
    description: '围绕一个可自定义 Learning Point 生成专项练习题。',
    task: 'practice-generation',
    systemRole: '你是面向中小学学生的 AI 练习题老师，必须按 Learning Point 的目标、常见错误和例题命题。',
    objective: '生成贴合指定 Learning Point 的练习题，题目要覆盖理解、应用和常见错误纠偏。',
    variables: [
      { name: 'knowledgePointTitle', description: '目标 Learning Point 标题', required: true },
      { name: 'questionCount', description: '题目数量', required: true },
      { name: 'difficulty', description: '难度 easy/medium/hard', required: true },
      { name: 'questionTypeInstruction', description: '题型要求', required: true },
    ],
    learningPointMode: {
      enabled: true,
      maxPoints: 3,
      includeFields: ['title', 'summary', 'objectives', 'keyConcepts', 'commonMistakes', 'explanation', 'examples', 'masteryCriteria', 'practiceProfile', 'teachingTags'],
      fallbackInstruction: '如果没有 Learning Point 详情，也必须紧扣 knowledgePointTitle，不要扩展到无关知识点。',
    },
    rules: [
      '只返回严格 JSON，不要输出 Markdown。',
      'JSON 顶层必须是 questions 数组，数组长度必须等于 questionCount。',
      'questionType 只能是 single_choice、fill_blank、short_answer；mixed 请求只能输出 single_choice 与 fill_blank。',
      'single_choice 必须提供正好 4 个 options，且 answer 必须是其中一个选项；其它题型 options 必须为空数组。',
      'answer、explanation、knowledgePointTitle、difficulty 必须存在且非空。',
      '题目要体现 Learning Point 的 keyConcepts、commonMistakes 或 examples，不能只套用模板数字。',
    ],
    outputContract: `{
  "questions": [
    {
      "questionText": "...",
      "questionType": "single_choice | fill_blank | short_answer",
      "options": [],
      "answer": "...",
      "explanation": "...",
      "knowledgePointTitle": "...",
      "difficulty": "easy | medium | hard"
    }
  ]
}`,
  },
  {
    id: 'generate-monthly-wrong-set-exam',
    name: '月度错题复习卷生成',
    description: '基于月度错题摘要和 Learning Points 分布生成复习卷。',
    task: 'monthly-exam',
    systemRole: '你是一名中国中小学试卷命题老师，擅长把错题本映射为 Learning Points 复习卷。',
    objective: '生成一张围绕高频错题 Learning Points 的复习卷，兼顾前置知识和综合应用。',
    variables: [
      { name: 'grade', description: '年级', required: true },
      { name: 'subject', description: '学科', required: true },
      { name: 'textbookVersion', description: '教材版本', required: true },
      { name: 'month', description: '月份', required: true },
      { name: 'wrongCount', description: '错题数量', required: true },
      { name: 'topKnowledgePoints', description: '高频知识点', required: true },
      { name: 'summaryJson', description: '错题摘要 JSON', required: true },
    ],
    learningPointMode: {
      enabled: true,
      maxPoints: 10,
      includeFields: ['title', 'summary', 'objectives', 'keyConcepts', 'commonMistakes', 'examples', 'masteryCriteria', 'teachingTags'],
      fallbackInstruction: '没有详情的高频点可按标题命题，但不要新增不存在于摘要或 Learning Points 中的核心知识点。',
    },
    rules: [
      '只返回严格 JSON，不要输出 Markdown。',
      '题目数量建议 20 题左右，具体以调用方截取为准。',
      '题目分布：70% 覆盖高频错题知识点，20% 覆盖相邻或前置知识点，10% 为综合应用题。',
      '不要直接照抄原错题，必须改编。',
      '所有题目必须适合指定年级，题干不能泄露答案。',
      'single_choice 必须有 4 个选项；difficulty 只能是 easy、medium、hard。',
    ],
    outputContract: `{
  "title": "YYYY-MM错题复习卷",
  "questions": [
    {
      "questionText": "...",
      "questionType": "single_choice | fill_blank | short_answer",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "...",
      "explanation": "...",
      "knowledgePointTitle": "...",
      "difficulty": "easy | medium | hard"
    }
  ]
}`,
  },
];

const DEFAULT_PACK: PromptTemplatePack = {
  schemaVersion: promptTemplateSchemaVersion,
  packVersion: 'builtin-2026-05-14',
  locale: 'zh-CN',
  templates: DEFAULT_TEMPLATES,
  updatedAt: '2026-05-14T00:00:00.000Z',
};

async function readActivePack(): Promise<PromptTemplatePack> {
  try {
    const raw = JSON.parse(await fs.readFile(activePackPath, 'utf8')) as unknown;
    return promptTemplatePackSchema.parse(raw);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return DEFAULT_PACK;
    throw error;
  }
}

function stringifyVariable(value: unknown) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function formatLearningPoint(point: LearningKnowledgePoint, mode: PromptLearningPointMode, index: number) {
  const parts: string[] = [`${index + 1}. ${point.title}`];
  if (mode.includeFields.includes('summary')) parts.push(`summary: ${point.summary}`);
  if (mode.includeFields.includes('objectives')) parts.push(`objectives: ${JSON.stringify(point.objectives, null, 2)}`);
  if (mode.includeFields.includes('keyConcepts')) parts.push(`keyConcepts: ${point.keyConcepts.join('、')}`);
  if (mode.includeFields.includes('commonMistakes')) parts.push(`commonMistakes: ${point.commonMistakes.map((item) => `${item.type}: ${item.description} -> ${item.remediation}`).join('；')}`);
  if (mode.includeFields.includes('explanation')) parts.push(`explanation: ${JSON.stringify(point.explanation, null, 2)}`);
  if (mode.includeFields.includes('examples')) parts.push(`examples: ${JSON.stringify(point.examples.slice(0, 3), null, 2)}`);
  if (mode.includeFields.includes('masteryCriteria')) parts.push(`masteryCriteria: ${point.masteryCriteria.join('；')}`);
  if (mode.includeFields.includes('practiceProfile')) parts.push(`practiceProfile: ${JSON.stringify(point.practiceProfile, null, 2)}`);
  if (mode.includeFields.includes('teachingTags')) parts.push(`teachingTags: ${point.teachingTags.join('、') || '未标注'}`);
  return parts.join('\n   ');
}

function buildPrompt(template: PromptTemplate, context: PromptRenderContext) {
  const variables = template.variables.map((variable) => {
    const value = context.variables[variable.name];
    return `- ${variable.name}：${value === undefined || value === null ? '(未提供)' : stringifyVariable(value)}`;
  }).join('\n');

  const learningPoints = template.learningPointMode.enabled
    ? (context.learningPoints ?? []).slice(0, template.learningPointMode.maxPoints)
    : [];
  const learningPointSection = template.learningPointMode.enabled
    ? `\n\nLearning Points 上下文（可由知识点包/自定义包运营）：\n${learningPoints.length > 0 ? learningPoints.map((point, index) => formatLearningPoint(point, template.learningPointMode, index)).join('\n\n') : '(未提供匹配 Learning Points)'}\n\nLearning Point 约束：${template.learningPointMode.fallbackInstruction}`
    : '';

  return `${template.systemRole}\n\n任务目标：\n${template.objective}\n\n输入变量：\n${variables}${learningPointSection}\n\n要求：\n${template.rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}\n\n输出 JSON 格式必须严格为：\n${template.outputContract}`;
}

export const promptTemplateService = {
  async listTemplates(): Promise<{ packVersion: string; updatedAt: string; templates: PromptTemplateSummary[]; source: 'builtin' | 'custom' }> {
    const customExists = await fs.access(activePackPath).then(() => true).catch(() => false);
    const pack = await readActivePack();
    return {
      packVersion: pack.packVersion,
      updatedAt: pack.updatedAt,
      source: customExists ? 'custom' : 'builtin',
      templates: pack.templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        task: template.task,
        learningPointMode: template.learningPointMode,
      })),
    };
  },

  async renderPrompt(id: PromptTemplateId, context: PromptRenderContext): Promise<string> {
    const templateId = promptTemplateIdSchema.parse(id);
    const pack = await readActivePack();
    const template = pack.templates.find((item) => item.id === templateId) ?? DEFAULT_TEMPLATES.find((item) => item.id === templateId);
    if (!template) throw new Error(`Prompt template not found: ${templateId}`);
    return buildPrompt(template, context);
  },

  async installPack(input: z.infer<typeof promptTemplatePackUploadSchema>) {
    const { pack, replace } = promptTemplatePackUploadSchema.parse(input);
    if (!replace) {
      const exists = await fs.access(activePackPath).then(() => true).catch(() => false);
      if (exists) throw new Error('自定义提示词包已存在');
    }
    const ids = new Set<PromptTemplateId>();
    for (const template of pack.templates) {
      if (ids.has(template.id)) throw new Error(`重复的提示词模板 ID：${template.id}`);
      ids.add(template.id);
    }
    await fs.mkdir(promptRoot, { recursive: true });
    await fs.writeFile(activePackPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    return { packVersion: pack.packVersion, templateCount: pack.templates.length, updatedAt: pack.updatedAt };
  },

  async exportDefaultPack() {
    return DEFAULT_PACK;
  },
};
