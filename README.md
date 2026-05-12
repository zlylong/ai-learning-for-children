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
- `/h5/profile`：**我的**。个人信息、档案管理；管理员额外显示 AI 模型高级设置和用户管理。
- `/h5/login`：**登录页**。支持管理员和普通用户登录。
- `/h5/profile/users`：**用户管理**。仅管理员可访问，用于新增和删除普通用户。

### 2. 练习中心
- `/h5/practice`：**练习入口**。支持一年级到六年级与语文/数学/英语切换，推荐最需练习的 1-3 个知识点；所有知识点列表会展示摘要和关键概念，点击知识点先打开讲解弹层，查看“为什么学 / 怎么学 / 例题解析 / 常见错误 / 掌握标准”后再开始练习。月度错题卷与长期薄弱项保留在首页入口，避免重复。
- `/h5/children/[id]/practice/new`：**知识点练习创建页**。选择年级、学科、知识点后，会同步展示该知识点的解释、学习步骤、关键概念和例题解析，再生成练习题。
- `/h5/practice-sessions/[id]`：**答题页**。沉浸式答题体验，一屏一题，大号输入/选项，进度追踪。
- `/h5/practice-sessions/[id]/result`：**练习反馈**。展示正确率、鼓励语、错题解析及后续建议。

### 3. 错题与分析
- `/h5/wrong-questions`：**错题本**。展示错题总数/科目/薄弱点摘要，支持题干/答案/解析/知识点搜索、科目筛选、知识点筛选；错题卡可展开查看我的答案、正确答案和解析，并可一键跳到对应知识点练习。
- `/h5/children/[id]/upload`：**上传试卷**。极简上传流程，支持文本粘贴与图片上传，分阶段显示分析进度。

### 4. 专项训练
- `/h5/children/[id]/exams/monthly`：**月度卷**。基于本月错题库自动生成的巩固试卷。
- `/h5/children/[id]/exams/weakness`：**薄弱点专项训练**。读取孩子的 `ChildKnowledgePoint`，按 `WEAK/PRACTICING`、错题数和掌握分排序，选择最需要强化的知识点，调用 `practice-generation` 功能路由生成专项练习；无薄弱点时展示空态并禁用生成。

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
- `POST /api/auth/login`：账号登录并写入 HttpOnly 会话 Cookie。
- `GET /api/auth/me`：读取当前登录用户。
- `POST /api/auth/logout`：退出登录并清除会话。
- `GET /api/users`：管理员读取用户列表。
- `POST /api/users`：管理员新增普通用户。
- `DELETE /api/users/[id]`：管理员删除普通用户；管理员账户不能在此删除。
- `GET /api/settings/ai`：管理员读取 AI 对接配置的脱敏信息。
- `PUT /api/settings/ai`：管理员保存 AI 对接配置，API Key 不会在响应中回显。
- `POST /api/settings/ai/test`：管理员测试 mock 或 OpenAI-compatible 模型服务连通性。

字段：`name`、`age`、`grade`、`province`、`city`、`textbookVersion`。表单校验由 Zod + React Hook Form 提供。

试卷分析闭环：`POST /api/exam-uploads` 先创建 `PENDING` 上传记录；`POST /api/exam-uploads/[id]/process` 同步触发 mock AI 分析，输出必须通过 `src/schemas/analyzeWrongQuestionsSchema.ts` 的 Zod 校验后才会写入 `WrongQuestion`、`WrongQuestionKnowledgePoint` 并把关联 `ChildKnowledgePoint` 更新为 `WEAK`。AI 输出异常时上传记录置为 `FAILED`，不会写入错题和掌握状态脏数据。

知识点练习闭环：练习中心和新建练习页均支持一年级到六年级与语文/数学/英语选择；知识点列表请求会携带 `grade`/`subject`，允许跨年级预习或回顾，并将 `subject` 传入练习 session；标准知识点会返回 `explanation`、`examples`、`keyConcepts`、`commonMistakes` 和 `masteryCriteria`，新建练习页在出题前展示“为什么学 / 怎么学 / 学习步骤 / 例题与解析”，帮助孩子先理解再练习。`src/ai/prompts/generatePracticeQuestionsPrompt.ts` 生成严格 JSON Prompt，并通过 `src/ai/ai-client.ts` 统一调用 mock AI。AI 输出必须先经过 `src/schemas/generatedPracticeQuestionsSchema.ts` 校验：题目数量 1-10；`single_choice` 必须 4 个选项；`answer` 与 `explanation` 必填；校验失败不会创建练习 session。`src/services/practiceService.ts` 负责创建 `PracticeSession`/`PracticeQuestion`、答题提交、简单 equals 判分、返回每题结果和 `masteryStatus`。提交后会保存每题 `userAnswer` 与 `isCorrect`，并更新 `ChildKnowledgePoint.practiceCount`、`correctCount`、`lastPracticedAt`；掌握状态规则：题数 >= 5 且正确率 >= 80% 为 `MASTERED`；正确率 >= 50% 且 < 80% 为 `PRACTICING`；正确率 < 50% 为 `WEAK`。

月度错题卷闭环：基于 `WrongQuestion` 表中的 `createdAt` 按月筛选，聚合各知识点的错题频率。AI Prompt (`src/ai/prompts/generateMonthlyWrongSetExamPrompt.ts`) 引导模型按 7:2:1 的比例改编错题知识点、相关知识点和综合题。生成的 `PracticeSession` 类型为 `MONTHLY_WRONG_SET`，答题提交后会根据试卷中的题目来源，**分知识点并行更新** 孩子的掌握度状态。

说明：未配置 `DATABASE_URL` 或设置 `CHILDREN_STORE=memory` 时，孩子档案、试卷分析和知识点练习 API 会使用开发期内存存储，方便无 PostgreSQL 环境直接启动 H5；配置 PostgreSQL 后使用 Prisma 存储。账号与会话当前保存到服务器本地 `.data/users.json`，该目录已加入 `.gitignore`；首次启动会自动创建默认管理员 `admin / admin123456`，生产使用前应替换默认密码或改接正式身份系统。


## 标准学习要点文件：LearningPointCatalog v1

系统现在支持直接读取 `data/learning-points` 下的标准学习要点 JSON 文件，供 `agent: learning` 后续批量生成小学语文、数学、英语知识点。

- `data/learning-points/manifest.json`：索引所有年级/学科/教材版本文件。
- `data/learning-points/g01` 到 `g06`：小学一至六年级语文、数学、英语默认学习要点数据，当前共 364 个知识点。
- `src/features/learning-points/schema.ts`：LearningPointCatalog v1 的 Zod 校验边界；每个知识点必须包含讲解 `explanation` 和至少 1 道例题 `examples`。
- `src/features/learning-points/loader.ts`：运行时读取、年级/学科别名归一化和扁平知识点转换；扁平列表会保留讲解、例题、关键概念、常见错误和掌握标准。
- `GET /api/learning-points?grade=G01&subject=math&version=default`：读取完整标准学习要点文件。
- `GET /api/learning-points?grade=一年级&subject=数学&view=points`：读取扁平知识点列表。
- `GET /api/children/[id]/knowledge-points?subject=math`：优先返回孩子已有掌握状态；暂无错题/掌握记录时，自动回退该孩子年级和教材版本对应的标准学习要点。
- `GET /api/children/[id]/knowledge-points?grade=三年级&subject=math`：按指定年级读取标准学习要点，并尽量把孩子已有同 ID/同名知识点掌握状态合并回列表。

详细生成规范见 `docs/learning-point-catalog-v1.md`。后续细化教材版本时，只需新增 `{subject}.{version}.json` 并更新 manifest。

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
- `AUTH_COOKIE_SECURE`: 仅在 H5 站点通过 HTTPS 提供服务时设置为 `true`；HTTP 测试环境保持为空，避免浏览器拒收登录 Cookie。

## 多用户与权限

- 支持两类账号：`ADMIN` 管理员、`USER` 普通用户。
- 普通用户可以登录并使用学习、练习、错题等 H5 功能，但不会看到“AI 模型设置”和“用户管理”入口。
- 只有管理员可以访问 `/h5/profile/advanced-settings` 与 `/h5/profile/users`。
- AI 设置相关 API 与用户管理 API 均做服务端管理员校验，不能只依赖前端隐藏入口。
- 管理员只能新增/删除普通用户；管理员账户不会通过用户管理页删除，避免误删导致锁死。
- 账户密码使用 PBKDF2-SHA256 哈希保存，会话使用 HttpOnly Cookie，用户数据文件 `.data/users.json` 权限写为 `0600`。

## 数据模型

Prisma schema 位于 `prisma/schema.prisma`，包含：

- `User`：包含可选 `username`/`passwordHash`/`role` 字段，用于正式数据库账号扩展；当前 H5 登录状态使用 `.data/users.json`。
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
