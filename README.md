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

## H5 设计约定 (v2.0)

- **Mobile-first**：专为 375px 手机宽度设计，最大宽度 480px 并居中显示。
- **任务导向**：每个页面服务一个核心任务，底部主按钮清晰，减少认知负担。
- **视觉风格**：简洁、干净、高留白，使用卡片圆角（24px-32px）与明亮配色，不幼稚化。
- **导航架构**：主导航为 4 个 Tab：首页、练习、错题、我的。
- **当前孩子**：系统自动跟踪当前选择的孩子，所有功能围绕该孩子展开。

## H5 核心模块与路由

### 1. 首页与导航
- `/h5`：**首页**。展示当前孩子卡片、今日练习建议、学习状态摘要（薄弱点、本月错题、正确率）及快捷入口。
- `/h5/children/select`：**切换孩子**。选择或创建孩子档案。
- `/h5/profile`：**我的**。个人信息、档案管理、AI 模型高级设置。

### 2. 练习中心
- `/h5/practice`：**练习入口**。推荐最需练习的 1-3 个知识点，支持手动选择所有知识点，提供月度错题卷与专项训练入口。
- `/h5/practice-sessions/[id]`：**答题页**。沉浸式答题体验，一屏一题，大号输入/选项，进度追踪。
- `/h5/practice-sessions/[id]/result`：**练习反馈**。展示正确率、鼓励语、错题解析及后续建议。

### 3. 错题与分析
- `/h5/wrong-questions`：**错题库**。高频薄弱知识点摘要，支持按学科筛选，折叠式题目卡片突出知识点与解析。
- `/h5/children/[id]/upload`：**上传试卷**。极简上传流程，支持文本粘贴与图片上传，分阶段显示分析进度。

### 4. 专项训练
- `/h5/children/[id]/exams/monthly`：**月度卷**。基于本月错题库自动生成的巩固试卷。
- `/h5/children/[id]/exams/weakness`：**专项训练**。针对长期薄弱点的强化练习计划。

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
- “我的 → 高级设置 · AI 对接”不再是单个全局模型，也不再只是 `text/ocr/audio` 能力拆分；正确结构是 **多个模型档案 + 功能路由**。
- 一个模型档案包含独立的供应商、Base URL、模型名、API Key、启用状态和超时时间；当前支持 `mock` 与 `openai-compatible`。
- 功能路由 `taskRoutes` 将业务功能绑定到模型档案：
  - `exam-analysis`：试卷错题分析。
  - `practice-generation`：知识点练习出题。
  - `monthly-exam`：月度错题卷生成。
  - `ocr`：图片/OCR 识别。
  - `audio`：语音/音频处理。
  - `text`：通用文本兜底。
- 因此可以配置：错题分析走 DeepSeek，OCR 走 Qwen-VL，音频走 Whisper，月度卷走另一个 OpenAI-compatible 或 mock 兜底。
- OpenAI-compatible 档案调用 `{baseUrl}/chat/completions`，要求模型返回严格 JSON；后续仍由各业务 Zod schema 校验后才会写入数据。
- AI 设置保存到服务器本地 `.data/ai-settings.json`，该目录已加入 `.gitignore`；API 只返回每个档案的 `hasApiKey` 与脱敏 `apiKeyMask`，不会把完整 API Key 回传前端。
- 生产环境建议把 API Key 迁移到 KMS/环境变量托管，避免长期明文落盘。
