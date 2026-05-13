#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${REPO:-zlylong/ai-learning-for-children}"
INSTALL_DIR="${INSTALL_DIR:-/opt/ai-learning-for-children}"
SERVICE_NAME="${SERVICE_NAME:-ai-learning}"
PORT="${PORT:-8080}"
HOSTNAME_VALUE="${HOSTNAME_VALUE:-0.0.0.0}"
AI_PROVIDER="${AI_PROVIDER:-mock}"
NODE_MAJOR_REQUIRED="${NODE_MAJOR_REQUIRED:-20}"
FALLBACK_TAG="v0.2.1"

INSTALL_POSTGRES="${INSTALL_POSTGRES:-true}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_learning_for_children}"
DB_USER="${DB_USER:-ai_learning}"
DB_PASSWORD="${DB_PASSWORD:-}"
RUNTIME_DATABASE_URL=""
GENERATED_DB_PASSWORD=""

log() { printf '\033[1;32m[ai-learning]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[ai-learning]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[ai-learning]\033[0m %s\n' "$*" >&2; exit 1; }

if [ "$(id -u)" -ne 0 ]; then
  fail "请使用 root 运行：curl -fsSL https://raw.githubusercontent.com/${REPO}/main/scripts/install.sh | sudo bash"
fi

export DEBIAN_FRONTEND=noninteractive

random_secret() {
  node -e "console.log(require('crypto').randomBytes(Number(process.argv[1] || 18)).toString('base64url'))" "${1:-18}"
}

url_encode() {
  node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$1"
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

validate_pg_identifier() {
  local value="$1"
  local name="$2"
  if ! printf '%s' "$value" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]{0,62}$'; then
    fail "${name} 只能包含字母、数字、下划线，且不能以数字开头：$value"
  fi
}

read_existing_database_url() {
  local env_file="$INSTALL_DIR/.env"
  if [ -f "$env_file" ]; then
    grep -E '^DATABASE_URL=' "$env_file" | tail -n1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/' || true
  fi
}

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

setup_database() {
  local existing_url
  existing_url="$(read_existing_database_url)"

  if [ -n "${DATABASE_URL:-}" ]; then
    RUNTIME_DATABASE_URL="$DATABASE_URL"
    log "使用外部 DATABASE_URL。"
    return
  fi

  if [ -n "$existing_url" ]; then
    RUNTIME_DATABASE_URL="$existing_url"
    log "保留已有 DATABASE_URL。"
    return
  fi

  if [ "$INSTALL_POSTGRES" != "true" ]; then
    warn "INSTALL_POSTGRES=false 且未提供 DATABASE_URL，将使用内存模式，数据不会持久化到 PostgreSQL。"
    RUNTIME_DATABASE_URL=""
    return
  fi

  validate_pg_identifier "$DB_NAME" "DB_NAME"
  validate_pg_identifier "$DB_USER" "DB_USER"

  log "安装并初始化 PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib
  systemctl enable --now postgresql

  if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD="$(random_secret 24)"
    GENERATED_DB_PASSWORD="$DB_PASSWORD"
  fi

  local escaped_password
  escaped_password="$(sql_escape "$DB_PASSWORD")"

  if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$(sql_escape "$DB_USER")'" | grep -q 1; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$escaped_password';"
  else
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "ALTER USER \"$DB_USER\" WITH PASSWORD '$escaped_password';"
  fi

  if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='$(sql_escape "$DB_NAME")'" | grep -q 1; then
    runuser -u postgres -- createdb -O "$DB_USER" "$DB_NAME"
  else
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "ALTER DATABASE \"$DB_NAME\" OWNER TO \"$DB_USER\";"
  fi

  local encoded_password
  encoded_password="$(url_encode "$DB_PASSWORD")"
  RUNTIME_DATABASE_URL="postgresql://${DB_USER}:${encoded_password}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

  PGPASSWORD="$DB_PASSWORD" psql "$RUNTIME_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT 1;' >/dev/null
  log "PostgreSQL 数据库已就绪：${DB_NAME}"
}

write_env_file() {
  local env_file="$INSTALL_DIR/.env"
  local initial_password="${INITIAL_ADMIN_PASSWORD:-}"
  if [ -z "$initial_password" ] && [ ! -f "$INSTALL_DIR/.data/users.json" ]; then
    initial_password="$(random_secret 14)"
  fi

  if [ ! -f "$env_file" ]; then
    log "生成环境配置：$env_file"
    cat >"$env_file" <<ENV_EOF
NODE_ENV=production
PORT=${PORT}
HOSTNAME=${HOSTNAME_VALUE}
AI_PROVIDER=${AI_PROVIDER}
AUTH_COOKIE_SECURE=false
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=${initial_password:-admin123456}
ENV_EOF
    if [ -n "$RUNTIME_DATABASE_URL" ]; then
      printf 'DATABASE_URL="%s"\n' "$RUNTIME_DATABASE_URL" >>"$env_file"
    else
      printf 'CHILDREN_STORE=memory\n' >>"$env_file"
    fi
    chmod 600 "$env_file"
  else
    log "保留已有环境配置：$env_file"
    if [ -n "$RUNTIME_DATABASE_URL" ]; then
      if ! grep -qE '^DATABASE_URL=' "$env_file"; then
        printf '\nDATABASE_URL="%s"\n' "$RUNTIME_DATABASE_URL" >>"$env_file"
      fi
      if grep -qE '^CHILDREN_STORE=memory$' "$env_file"; then
        sed -i 's/^CHILDREN_STORE=memory$/# CHILDREN_STORE=memory # disabled by installer after PostgreSQL setup/' "$env_file"
      fi
    fi
  fi

  if [ -n "$initial_password" ]; then
    cat >"$INSTALL_DIR/.data-initial-admin.txt" <<PASS_EOF
首次管理员账号：admin
首次管理员密码：${initial_password}
请登录后立即在用户管理或数据文件中替换默认管理员密码。
PASS_EOF
    chmod 600 "$INSTALL_DIR/.data-initial-admin.txt"
  fi

  if [ -n "$GENERATED_DB_PASSWORD" ]; then
    cat >"$INSTALL_DIR/.data-database.txt" <<DB_EOF
PostgreSQL 数据库：${DB_NAME}
PostgreSQL 用户：${DB_USER}
PostgreSQL 密码：${GENERATED_DB_PASSWORD}
DATABASE_URL=${RUNTIME_DATABASE_URL}
DB_EOF
    chmod 600 "$INSTALL_DIR/.data-database.txt"
  fi
}

run_database_migrations() {
  if [ -z "$RUNTIME_DATABASE_URL" ]; then
    log "跳过数据库迁移：当前为内存模式。"
    return
  fi

  log "执行数据库迁移..."
  DATABASE_URL="$RUNTIME_DATABASE_URL" npm --prefix "$INSTALL_DIR" run prisma:migrate:deploy
}

install_app() {
  log "安装 npm 依赖..."
  npm --prefix "$INSTALL_DIR" ci

  run_database_migrations

  log "构建 Next.js 应用..."
  DATABASE_URL="$RUNTIME_DATABASE_URL" npm --prefix "$INSTALL_DIR" run build
}

write_systemd_service() {
  log "写入 systemd 服务：${SERVICE_NAME}.service"
  cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE_EOF
[Unit]
Description=AI Learning for Children H5 Service
After=network-online.target postgresql.service
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
  journalctl -u "${SERVICE_NAME}.service" -n 80 --no-pager || true
  fail "服务启动超时，请查看：journalctl -u ${SERVICE_NAME}.service -f"
}

main() {
  install_base_deps
  install_node_if_needed
  local tag
  tag="$(resolve_tag)"
  checkout_code "$tag"
  setup_database
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
  if [ -f "$INSTALL_DIR/.data-database.txt" ]; then
    printf '\n数据库凭据保存在：%s/.data-database.txt\n' "$INSTALL_DIR"
  fi
}

main "$@"
