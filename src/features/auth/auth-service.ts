import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import type { CurrentUser, UserCreateValues, UserRole, UserSummary } from './schema';

export const SESSION_COOKIE_NAME = 'ai-learning-session';

const USERS_FILE = path.join(process.cwd(), '.data', 'users.json');
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123456';

const globalForAuth = globalThis as typeof globalThis & {
  __aiLearningAuthWriteQueue?: Promise<unknown>;
};

type StoredUser = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type StoredSession = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

type AuthState = {
  users: StoredUser[];
  sessions: StoredSession[];
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}

function toSummary(user: StoredUser): UserSummary {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [algorithm, roundsText, salt, hash] = stored.split('$');
  if (algorithm !== 'pbkdf2_sha256' || !roundsText || !salt || !hash) return false;
  const rounds = Number(roundsText);
  if (!Number.isInteger(rounds) || rounds < 10000) return false;
  const candidate = pbkdf2Sync(password, salt, rounds, 32, 'sha256');
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function createDefaultState(): AuthState {
  const timestamp = nowIso();
  return {
    users: [
      {
        id: 'admin-user',
        username: DEFAULT_ADMIN_USERNAME,
        name: '管理员',
        role: 'ADMIN',
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    sessions: [],
  };
}

async function readState(): Promise<AuthState> {
  try {
    const content = await readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(content) as AuthState;
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.sessions)) throw new Error('invalid auth state');
    if (!parsed.users.some((user) => user.role === 'ADMIN')) {
      const fallback = createDefaultState().users[0];
      parsed.users.unshift({ ...fallback, username: 'admin', id: createId('user') });
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      const initial = createDefaultState();
      await writeState(initial);
      return initial;
    }
    throw error;
  }
}

async function writeState(state: AuthState): Promise<AuthState> {
  await mkdir(path.dirname(USERS_FILE), { recursive: true });
  await writeFile(USERS_FILE, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await chmod(USERS_FILE, 0o600).catch(() => undefined);
  return state;
}

async function mutateState<T>(mutator: (state: AuthState) => Promise<T> | T): Promise<T> {
  const previous = globalForAuth.__aiLearningAuthWriteQueue ?? Promise.resolve();
  let release!: () => void;
  globalForAuth.__aiLearningAuthWriteQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous.catch(() => undefined);
  try {
    const state = await readState();
    const result = await mutator(state);
    await writeState(state);
    return result;
  } finally {
    release();
  }
}

function isExpired(session: StoredSession) {
  return new Date(session.expiresAt).getTime() <= Date.now();
}

async function getUserByToken(token?: string | null): Promise<CurrentUser | null> {
  if (!token) return null;
  const state = await readState();
  const session = state.sessions.find((item) => item.token === token);
  if (!session || isExpired(session)) return null;
  const user = state.users.find((item) => item.id === session.userId);
  return user ? toSummary(user) : null;
}

export const authService = {
  sessionCookieName: SESSION_COOKIE_NAME,
  defaultAdmin: { username: DEFAULT_ADMIN_USERNAME, password: DEFAULT_ADMIN_PASSWORD },

  async login(input: { username: string; password: string }): Promise<{ user: CurrentUser; token: string; expiresAt: string } | null> {
    const state = await readState();
    const user = state.users.find((item) => item.username.toLowerCase() === input.username.trim().toLowerCase());
    if (!user || !verifyPassword(input.password, user.passwordHash)) return null;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    await mutateState((next) => {
      next.sessions = next.sessions.filter((session) => !isExpired(session) && session.userId !== user.id);
      next.sessions.push({ token, userId: user.id, createdAt: nowIso(), expiresAt });
    });
    return { user: toSummary(user), token, expiresAt };
  },

  async logout(token?: string | null): Promise<void> {
    if (!token) return;
    await mutateState((state) => {
      state.sessions = state.sessions.filter((session) => session.token !== token);
    });
  },

  async getCurrentUserFromRequest(request: Request): Promise<CurrentUser | null> {
    const cookie = request.headers.get('cookie') ?? '';
    const match = cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]+)`));
    return getUserByToken(match ? decodeURIComponent(match[1]) : null);
  },

  async getCurrentUserFromCookies(cookies: { get(name: string): { value: string } | undefined }): Promise<CurrentUser | null> {
    return getUserByToken(cookies.get(SESSION_COOKIE_NAME)?.value);
  },

  async requireAdminFromRequest(request: Request): Promise<CurrentUser | null> {
    const user = await this.getCurrentUserFromRequest(request);
    return user?.role === 'ADMIN' ? user : null;
  },

  async listUsers(): Promise<UserSummary[]> {
    const state = await readState();
    return [...state.users].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(toSummary);
  },

  async createUser(input: UserCreateValues): Promise<UserSummary> {
    return mutateState((state) => {
      const username = input.username.trim();
      if (state.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('用户名已存在');
      }
      const timestamp = nowIso();
      const user: StoredUser = {
        id: createId('user'),
        username,
        name: input.name.trim(),
        role: 'USER',
        passwordHash: hashPassword(input.password),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state.users.push(user);
      return toSummary(user);
    });
  },

  async deleteOrdinaryUser(id: string): Promise<boolean> {
    return mutateState((state) => {
      const user = state.users.find((item) => item.id === id);
      if (!user) return false;
      if (user.role !== 'USER') throw new Error('只能删除普通用户');
      state.users = state.users.filter((item) => item.id !== id);
      state.sessions = state.sessions.filter((session) => session.userId !== id);
      return true;
    });
  },
};
