#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${REPO:-zlylong/ai-learning-for-children}"
INSTALL_DIR="${INSTALL_DIR:-/opt/ai-learning-for-children}"
SERVICE_NAME="${SERVICE_NAME:-ai-learning}"
PORT="${PORT:-8080}"
HOSTNAME_VALUE="${HOSTNAME_VALUE:-0.0.0.0}"
AI_PROVIDER="${AI_PROVIDER:-mock}"
CHILDREN_STORE="${CHILDREN_STORE:-memory}"
NODE_MAJOR_REQUIRED="${NODE_MAJOR_REQUIRED:-20}"
FALLBACK_TAG="v0.2.0"

log() { printf '\033[1;32m[ai-learning]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[ai-learning]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[ai-learning]\033[0m %s\n' "$*" >&2; exit 1; }

if [ "$(id -u)" -ne 0 ]; then
  fail "请使用 root 运行：curl -fsSL https://raw.githubusercontent.com/${REPO}/main/scripts/install.sh | sudo bash"
fi

export DEBIAN_FRONTEND=noninteractive

install_base_deps() {
  if command -v apt-get >/dev/null 2>&1; then
    log "安装基础依赖 curl/git/ca-certificates..."
    apt-get update -y
    apt-get install -y ca-certificates curl git xz-utils
  else
    fail "当前一键脚本仅支持 Debian/Ubuntu 系统（需要 apt-get）。"
  fi
}

node_major() {
  node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0
}

install_node_if_needed() {
  local current_major
  current_major="$(node_major)"
  if [ "$current_major" -ge "$NODE_MAJOR_REQUIRED" ] 2>/dev/null; then
    log "Node.js 已满足要求：$(node -v)"
    return
  fi

  log "安装 Node.js ${NODE_MAJOR_REQUIRED}.x..."
  curl -fsSL -4 --retry 3 --connect-timeout 10 "https://deb.nodesource.com/setup_${NODE_MAJOR_REQUIRED}.x" | bash -
  apt-get install -y nodejs

  current_major="$(node_major)"
  if [ "$current_major" -lt "$NODE_MAJOR_REQUIRED" ] 2>/dev/null; then
    fail "Node.js 安装失败或版本过低：$(node -v 2>/dev/null || echo missing)"
  fi
}

resolve_tag() {
  if [ -n "${VERSION:-}" ]; then
    printf '%s\n' "$VERSION"
    return
  fi

  local latest=""
  latest="$(curl -fsSL -4 --retry 3 --connect-timeout 8 "https://api.github.com/repos/${REPO}/releases/latest" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s); process.stdout.write(j.tag_name || '')}catch{}})" 2>/dev/null || true)"

  if [ -z "$latest" ]; then
    warn "无法从 GitHub API 获取 latest release，回退到 ${FALLBACK_TAG}。也可通过 VERSION=vX.Y.Z 指定版本。"
    latest="$FALLBACK_TAG"
  fi

  printf '%s\n' "$latest"
}

checkout_code() {
  local tag="$1"
  mkdir -p "$(dirname "$INSTALL_DIR")"

  if [ -d "$INSTALL_DIR/.git" ]; then
    log "更新已有代码仓库：$INSTALL_DIR"
    git -C "$INSTALL_DIR" fetch --tags --force origin
  else
    if [ -e "$INSTALL_DIR" ]; then
      warn "$INSTALL_DIR 已存在但不是 Git 仓库，将备份为 ${INSTALL_DIR}.bak.$(date +%Y%m%d%H%M%S)"
      mv "$INSTALL_DIR" "${INSTALL_DIR}.bak.$(date +%Y%m%d%H%M%S)"
    fi
    log "克隆仓库 https://github.com/${REPO}.git 到 $INSTALL_DIR"
    git clone "https://github.com/${REPO}.git" "$INSTALL_DIR"
    git -C "$INSTALL_DIR" fetch --tags --force origin
  fi

  log "切换到版本：$tag"
  git -C "$INSTALL_DIR" checkout --force "$tag"
}

write_env_file() {
  local env_file="$INSTALL_DIR/.env"
  local initial_password="${INITIAL_ADMIN_PASSWORD:-}"
  if [ -z "$initial_password" ] && [ ! -f "$INSTALL_DIR/.data/users.json" ]; then
    initial_password="$(node -e "console.log(require('crypto').randomBytes(14).toString('base64url'))")"
  fi

  if [ ! -f "$env_file" ]; then
    log "生成环境配置：$env_file"
    cat >"$env_file" <<ENV_EOF
NODE_ENV=production
PORT=${PORT}
HOSTNAME=${HOSTNAME_VALUE}
AI_PROVIDER=${AI_PROVIDER}
CHILDREN_STORE=${CHILDREN_STORE}
AUTH_COOKIE_SECURE=false
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=${initial_password:-admin123456}
ENV_EOF
    chmod 600 "$env_file"
  else
    log "保留已有环境配置：$env_file"
  fi

  if [ -n "$initial_password" ]; then
    cat >"$INSTALL_DIR/.data-initial-admin.txt" <<PASS_EOF
首次管理员账号：admin
首次管理员密码：${initial_password}
请登录后立即在用户管理或数据文件中替换默认管理员密码。
PASS_EOF
    chmod 600 "$INSTALL_DIR/.data-initial-admin.txt"
  fi
}

install_app() {
  log "安装 npm 依赖..."
  npm --prefix "$INSTALL_DIR" ci

  log "构建 Next.js 应用..."
  npm --prefix "$INSTALL_DIR" run build
}

write_systemd_service() {
  log "写入 systemd 服务：${SERVICE_NAME}.service"
  cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE_EOF
[Unit]
Description=AI Learning for Children H5 Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
KillSignal=SIGTERM
TimeoutStopSec=20
NoNewPrivileges=yes
RestrictSUIDSGID=yes
PrivateTmp=yes
ProtectKernelTunables=yes
ProtectControlGroups=yes

[Install]
WantedBy=multi-user.target
SERVICE_EOF

  systemctl daemon-reload
  systemctl enable --now "${SERVICE_NAME}.service"
  systemctl restart "${SERVICE_NAME}.service"
}

wait_until_ready() {
  local url="http://127.0.0.1:${PORT}/h5"
  log "等待服务启动：$url"
  for _ in $(seq 1 40); do
    if curl -fsS -4 --connect-timeout 2 "$url" >/dev/null 2>&1; then
      log "服务已启动：$url"
      return
    fi
    sleep 1
  done

  systemctl --no-pager --full status "${SERVICE_NAME}.service" || true
  fail "服务启动超时，请查看：journalctl -u ${SERVICE_NAME}.service -f"
}

main() {
  install_base_deps
  install_node_if_needed
  local tag
  tag="$(resolve_tag)"
  checkout_code "$tag"
  write_env_file
  install_app
  write_systemd_service
  wait_until_ready

  log "安装完成。"
  printf '\n访问地址：http://<服务器IP>:%s/h5\n' "$PORT"
  printf '服务管理：systemctl status %s.service\n' "$SERVICE_NAME"
  if [ -f "$INSTALL_DIR/.data-initial-admin.txt" ]; then
    printf '\n初始管理员凭据保存在：%s/.data-initial-admin.txt\n' "$INSTALL_DIR"
    cat "$INSTALL_DIR/.data-initial-admin.txt"
  fi
}

main "$@"
