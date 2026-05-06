# AI Learning for Children

面向手机浏览器的 AI 学习诊断 H5 Web 服务。当前版本先搭建清晰可启动的 H5 架构，不接入真实 AI API，不实现复杂业务。

## 技术栈

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Ant Design Mobile
- Prisma + PostgreSQL
- Zod + React Hook Form
- AI Provider 抽象层（当前仅 `mock` provider）

## H5 设计约定

- Mobile-first，适配 iPhone 与 Android 手机浏览器。
- 页面容器最大宽度 `480px` 并居中。
- 使用 `src/components/h5/AppShell.tsx` 作为 H5 外壳。
- 底部导航使用 `src/components/h5/BottomTabBar.tsx`。
- 固定主操作按钮使用 `src/components/h5/FixedActionBar.tsx`，避让底部 Tab 与 safe-area。
- 使用卡片、列表、移动端表单，不做 PC 风格后台和复杂表格。

## H5 孩子档案模块

页面：

- `/h5/children`：孩子卡片列表，支持下拉刷新、加载/错误/空状态。
- `/h5/children/new`：新增孩子档案。
- `/h5/children/[id]`：查看孩子档案详情，支持删除。
- `/h5/children/[id]/edit`：编辑孩子档案。
- `/h5/children/[id]/uploads`：粘贴试卷结果文本或上传图片（OCR mock），点击底部固定按钮开始分析。
- `/h5/children/[id]/wrong-questions`：用移动端卡片展示错题题干、学生答案、正确答案、错误原因和关联知识点。
- `/h5/children/[id]/practice/new`：知识点练习创建页，使用列表/弹窗选择知识点、Stepper 选择 1-10 题、Segmented 选择难度、Selector 选择题型。
- `/h5/practice-sessions/[id]`：答题页，一屏展示一道题，底部固定“上一题 / 下一题 / 提交”按钮。
- `/h5/practice-sessions/[id]/result`：结果页，用移动端卡片展示正确率、掌握状态变化和错题解析。
- `/h5/children/[id]/exams/monthly`：月度错题卷配置页，展示本月错题概览、高频知识点，并支持 AI 生成复习卷。
- `/h5/profile/advanced-settings`：高级设置页，用移动端表单配置 AI 对接 Provider、Base URL、模型、API Key 与连接测试。

API：

- `GET /api/children`
- `POST /api/children`
- `PATCH /api/children/[id]`
- `DELETE /api/children/[id]`
- `POST /api/exam-uploads`
- `GET /api/exam-uploads?childId=`
- `POST /api/exam-uploads/[id]/process`
- `GET /api/wrong-questions?childId=`
- `POST /api/practice-sessions`
- `GET /api/practice-sessions/[id]`
- `POST /api/practice-sessions/[id]/submit`
- `GET /api/exams/monthly/preview`：获取月度错题统计与建议生成题数。
- `POST /api/exams/monthly`：调用 AI 生成月度复习试卷。
- `GET /api/settings/ai`：读取 AI 对接配置的脱敏信息。
- `PUT /api/settings/ai`：保存 AI 对接配置，API Key 不会在响应中回显。
- `POST /api/settings/ai/test`：测试 mock 或 OpenAI-compatible 模型服务连通性。

字段：`name`、`age`、`grade`、`province`、`city`、`textbookVersion`。表单校验由 Zod + React Hook Form 提供。

试卷分析闭环：`POST /api/exam-uploads` 先创建 `PENDING` 上传记录；`POST /api/exam-uploads/[id]/process` 同步触发 mock AI 分析，输出必须通过 `src/schemas/analyzeWrongQuestionsSchema.ts` 的 Zod 校验后才会写入 `WrongQuestion`、`WrongQuestionKnowledgePoint` 并把关联 `ChildKnowledgePoint` 更新为 `WEAK`。AI 输出异常时上传记录置为 `FAILED`，不会写入错题和掌握状态脏数据。

知识点练习闭环：`src/ai/prompts/generatePracticeQuestionsPrompt.ts` 生成严格 JSON Prompt，并通过 `src/ai/ai-client.ts` 统一调用 mock AI。AI 输出必须先经过 `src/schemas/generatedPracticeQuestionsSchema.ts` 校验：题目数量 1-10；`single_choice` 必须 4 个选项；`answer` 与 `explanation` 必填；校验失败不会创建练习 session。`src/services/practiceService.ts` 负责创建 `PracticeSession`/`PracticeQuestion`、答题提交、简单 equals 判分、返回每题结果和 `masteryStatus`。提交后会保存每题 `userAnswer` 与 `isCorrect`，并更新 `ChildKnowledgePoint.practiceCount`、`correctCount`、`lastPracticedAt`；掌握状态规则：题数 >= 5 且正确率 >= 80% 为 `MASTERED`；正确率 >= 50% 且 < 80% 为 `PRACTICING`；正确率 < 50% 为 `WEAK`。

月度错题卷闭环：基于 `WrongQuestion` 表中的 `createdAt` 按月筛选，聚合各知识点的错题频率。AI Prompt (`src/ai/prompts/generateMonthlyWrongSetExamPrompt.ts`) 引导模型按 7:2:1 的比例改编错题知识点、相关知识点和综合题。生成的 `PracticeSession` 类型为 `MONTHLY_WRONG_SET`，答题提交后会根据试卷中的题目来源，**分知识点并行更新** 孩子的掌握度状态。

说明：未配置 `DATABASE_URL` 或设置 `CHILDREN_STORE=memory` 时，孩子档案、试卷分析和知识点练习 API 会使用开发期内存存储，方便无 PostgreSQL 环境直接启动 H5；配置 PostgreSQL 后使用 Prisma 存储。

## 快速开始

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

默认开发服务监听 `0.0.0.0`，可通过手机浏览器访问开发机 IP。

## 环境变量

见 `.env.example`：

- `DATABASE_URL`: PostgreSQL 连接串。
- `AI_PROVIDER`: 当前仅支持 `mock`。

## 数据模型

Prisma schema 位于 `prisma/schema.prisma`，包含：

- `User`
- `Child`
- `Textbook`
- `Chapter`
- `KnowledgePoint`
- `ExamUpload`
- `WrongQuestion`
- `WrongQuestionKnowledgePoint`
- `ChildKnowledgePoint`
- `PracticeSession`
- `PracticeQuestion`

## 常用脚本

```bash
npm run dev              # 启动 Next.js 开发服务
npm run build            # Prisma generate + Next.js 构建
npm run typecheck        # TypeScript 类型检查
npm run lint             # ESLint 检查
npm run test             # Vitest 单元测试
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:migrate   # 本地开发迁移
```

## AI Provider 抽象

入口位于 `src/ai/ai-client.ts`：

- 默认使用 mock provider，保证无外部 API 时也能完成 H5 演示。
- “我的 → 高级设置 · AI 对接”可配置 `mock` 或 `openai-compatible` provider。
- OpenAI-compatible 模式调用 `{baseUrl}/chat/completions`，要求模型返回严格 JSON；后续仍由各业务 Zod schema 校验后才会写入数据。
- AI 设置保存到服务器本地 `.data/ai-settings.json`，该目录已加入 `.gitignore`；API 只返回 `hasApiKey` 与脱敏 `apiKeyMask`，不会把完整 API Key 回传前端。
- 生产环境建议把 API Key 迁移到 KMS/环境变量托管，避免长期明文落盘。
