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

API：

- `GET /api/children`
- `POST /api/children`
- `PATCH /api/children/[id]`
- `DELETE /api/children/[id]`
- `POST /api/exam-uploads`
- `GET /api/exam-uploads?childId=`
- `GET /api/wrong-questions?childId=`

字段：`name`、`age`、`grade`、`province`、`city`、`textbookVersion`。表单校验由 Zod + React Hook Form 提供。

试卷分析通过 `src/ai/ai-client.ts` 调用 mock AI，AI 输出必须先通过 Zod schema 校验，校验或分析失败时不会写入上传记录和错题脏数据。

说明：未配置 `DATABASE_URL` 或设置 `CHILDREN_STORE=memory` 时，孩子档案 API 会使用开发期内存存储，方便无 PostgreSQL 环境直接启动 H5；配置 PostgreSQL 后使用 Prisma 存储。

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

入口位于 `src/lib/ai/index.ts`：

- `createAiProvider()` 根据 `AI_PROVIDER` 创建 provider。
- 当前只实现 `MockAiProvider`。
- 后续接入真实模型时新增 provider 实现即可，不影响 H5 组件。
