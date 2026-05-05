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
- 使用卡片、列表、移动端表单，不做 PC 风格后台和复杂表格。

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
