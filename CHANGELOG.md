# Changelog

## v0.2.2 - 2026-05-18

### 修复

- **登录 Cookie Secure 标记修复**：修复了管理员无法登录的问题。之前在生产模式下 `NODE_ENV=production` 导致 Set-Cookie 始终带有 `Secure` 标记，HTTP 请求的浏览器不会将该 Cookie 发回服务器，表现为“登录成功但始终未登录”。现改为自动检测请求的实际协议（`x-forwarded-proto` / `request.url`），仅在真正走 HTTPS 时设置 `Secure`。
- **移除 `AUTH_COOKIE_SECURE` 环境变量**：改为自动检测，不再需要手动配置。

### 文档

- `.env.example` 移除已弃用的 `AUTH_COOKIE_SECURE` 变量，补充默认密码说明。
- `README.md` 添加开发环境默认密码说明和注意事项。

## v0.2.1 - 2026-05-13

### 修复

- 一键安装脚本默认安装并初始化 PostgreSQL，不再默认使用内存模式。
- 新增 Prisma 初始迁移文件，安装时自动执行 `prisma migrate deploy` 创建业务表。
- `.env` 首次生成时自动写入 `DATABASE_URL`；本机生成的数据库凭据保存到 `.data-database.txt`。
- 支持外部 `DATABASE_URL`、`INSTALL_POSTGRES=false` 内存演示模式以及 `DB_NAME` / `DB_USER` / `DB_PASSWORD` 覆盖。

## v0.2.0 - 2026-05-13

### 新增

- 发布 GitHub Release 自动化流程：推送 `v*` 标签后自动执行 typecheck、lint、test、build，并生成源码包与 SHA256 校验文件。
- 新增一键安装脚本 `scripts/install.sh`，支持 Debian/Ubuntu 上自动安装 Node.js 20、拉取指定版本、构建 Next.js、写入 systemd 服务并启动。
- 新增 `.env.example`，明确生产/测试环境变量。
- 初始管理员账号支持通过 `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` 环境变量覆盖；一键安装时会为首次安装生成随机初始密码。

### 说明

- 默认安装目录：`/opt/ai-learning-for-children`
- 默认服务名：`ai-learning.service`
- 默认端口：`8080`
- 可通过环境变量覆盖：`VERSION`、`INSTALL_DIR`、`SERVICE_NAME`、`PORT`、`INITIAL_ADMIN_PASSWORD`。
