# AI Learning for Children

面向手机浏览器的儿童 AI 学习诊断 H5 应用。项目围绕“上传试卷/错题 → 识别薄弱知识点 → 查看讲解和例题 → 生成练习 → 更新掌握度”形成学习闭环，适合家长陪伴孩子做课后巩固和错题复盘。

## 主要功能

- **孩子档案**：管理孩子年级、地区、教材版本等基础信息。
- **错题分析**：支持文本或图片上传试卷/错题，生成错题记录和薄弱知识点。
- **知识点讲解**：内置小学一年级至初中三年级语文、数学、英语知识点，包含解释、例题、常见错误和掌握标准。
- **智能练习**：根据孩子薄弱点生成专项练习，支持轻量、标准、强化三种训练强度。
- **错题本**：按科目和知识点整理错题，支持查看答案、解析和再次练习。
- **学习计划**：自动安排每周薄弱点专项练习和每月错题卷。
- **家长/孩子模式**：孩子模式更简单，家长模式提供更多筛选和配置能力。
- **内容包管理**：管理员可上传或替换标准知识点包。
- **提示词包管理**：错题诊断、练习生成、月度复习卷提示词支持像 Learning Points 一样上传自定义包。
- **AI 模型配置**：支持 mock 模式，也可配置 OpenAI-compatible 模型档案和功能路由。

## 页面入口

- `/h5`：首页
- `/h5/practice`：统一练习入口
- `/h5/wrong-questions`：错题本
- `/h5/children/select`：选择或创建孩子档案
- `/h5/profile`：我的 / 管理入口
- `/h5/profile/prompt-templates`：管理员提示词包管理

## 技术栈

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Ant Design Mobile
- Prisma + PostgreSQL
- Zod + React Hook Form

## 一键安装

Debian/Ubuntu 服务器可直接执行：

```bash
curl -fsSL -4 https://raw.githubusercontent.com/zlylong/ai-learning-for-children/main/scripts/install.sh | sudo bash
```

指定版本安装：

```bash
curl -fsSL -4 https://raw.githubusercontent.com/zlylong/ai-learning-for-children/main/scripts/install.sh | sudo VERSION=v0.2.1 bash
```

常用参数：

```bash
PORT=8080
INSTALL_DIR=/opt/ai-learning-for-children
SERVICE_NAME=ai-learning
INITIAL_ADMIN_PASSWORD=your-password
DB_NAME=ai_learning_for_children
DB_USER=ai_learning
DB_PASSWORD=your-db-password
```

默认会在本机安装 PostgreSQL，创建数据库和用户，写入 `DATABASE_URL`，并执行 Prisma 迁移。数据库凭据会保存到安装目录下的 `.data-database.txt`。如需使用外部数据库，可在安装时传入 `DATABASE_URL`；如仅临时演示且不需要持久化，可传入 `INSTALL_POSTGRES=false` 使用内存模式。

安装完成后访问：

```text
http://<服务器IP>:8080/h5
```

服务管理：

```bash
systemctl status ai-learning.service
systemctl restart ai-learning.service
journalctl -u ai-learning.service -f
```

## 本地开发

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

默认监听 `0.0.0.0`，可通过手机浏览器访问开发机 IP。

## 常用命令

```bash
npm run dev              # 启动开发服务
npm run build            # 生产构建
npm run typecheck        # TypeScript 检查
npm run lint             # ESLint 检查
npm run test             # 单元测试
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:migrate   # 本地开发迁移
```

## 环境变量

见 `.env.example`。常用项：

- `DATABASE_URL`：PostgreSQL 连接串；一键安装默认创建本机 PostgreSQL 并自动写入。
- `AI_PROVIDER`：AI provider，默认 `mock`。
- `CHILDREN_STORE`：仅临时演示时设置为 `memory`，正式安装不要设置。
- `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD`：首次初始化管理员账号。
- `AUTH_COOKIE_SECURE`：HTTPS 部署时设置为 `true`。

## 知识点数据

标准知识点位于 `data/learning-points`，格式为 `LearningPointCatalog v1`。新增或替换内容包时需要通过 Zod Schema 校验，详细规范见：

- `docs/learning-point-catalog-v1.md`
- `data/learning-points/README.md`

## 提示词数据

提示词位于内置 `PromptTemplatePack v1`，管理员可在 `/h5/profile/prompt-templates` 上传自定义包，生效文件保存到 `.data/prompt-templates/active.json`。所有 AI 功能仍保留 Zod 输出校验，详细规范见：

- `docs/prompt-template-pack-v1.md`

## 发布

推送 `v*` 标签会触发 GitHub Actions 自动发布 Release，并生成源码包和 SHA256 校验文件。
