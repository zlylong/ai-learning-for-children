# Changelog

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
