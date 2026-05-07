import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import {
  aiSettingsSchema,
  aiSettingsUpdateSchema,
  DEFAULT_DEEPSEEK_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_PROFILE_ID,
  type AiProfile,
  type AiSettings,
  type AiSettingsPublic,
  type AiSettingsUpdate,
} from './ai-settings-schema';

const DEFAULT_PROFILE: AiProfile = {
  id: DEFAULT_PROFILE_ID,
  name: '默认文本模型',
  enabled: false,
  provider: 'mock',
  baseUrl: undefined,
  model: 'mock',
  apiKey: undefined,
  timeoutMs: 30000,
};

const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: 'mock',
  baseUrl: DEFAULT_OPENAI_BASE_URL,
  model: DEFAULT_DEEPSEEK_MODEL,
  profiles: [DEFAULT_PROFILE],
  taskRoutes: {
    text: DEFAULT_PROFILE_ID,
    'exam-analysis': DEFAULT_PROFILE_ID,
    'practice-generation': DEFAULT_PROFILE_ID,
    'monthly-exam': DEFAULT_PROFILE_ID,
    ocr: undefined,
    audio: undefined,
  },
  apiKey: undefined,
  timeoutMs: 30000,
};

const SETTINGS_FILE = path.join(process.cwd(), '.data', 'ai-settings.json');

function maskApiKey(apiKey?: string): string | undefined {
  if (!apiKey) return undefined;
  if (apiKey.length <= 8) return '••••';
  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}

function toPublicSettings(settings: AiSettings): AiSettingsPublic {
  return {
    enabled: settings.enabled,
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    model: settings.model,
    profiles: settings.profiles.map(({ apiKey, ...profile }) => ({
      ...profile,
      hasApiKey: Boolean(apiKey),
      apiKeyMask: maskApiKey(apiKey),
    })),
    taskRoutes: settings.taskRoutes,
    timeoutMs: settings.timeoutMs,
    hasApiKey: Boolean(settings.apiKey || settings.profiles.some((profile) => profile.apiKey)),
    apiKeyMask: maskApiKey(settings.apiKey),
    updatedAt: settings.updatedAt,
  };
}

async function readRawSettings(): Promise<AiSettings> {
  try {
    const content = await readFile(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    const settings = aiSettingsSchema.parse(parsed) as AiSettings;
    if (parsed && typeof parsed === 'object' && typeof (parsed as { updatedAt?: unknown }).updatedAt === 'string') {
      settings.updatedAt = (parsed as { updatedAt: string }).updatedAt;
    }
    return settings;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return DEFAULT_AI_SETTINGS;
    }
    throw error;
  }
}

async function writeRawSettings(settings: AiSettings): Promise<AiSettings> {
  const next = { ...settings, updatedAt: new Date().toISOString() };
  await mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await chmod(SETTINGS_FILE, 0o600).catch(() => undefined);
  return next;
}

function mergeProfileSecrets(current: AiSettings, parsed: AiSettingsUpdate): AiProfile[] {
  const currentById = new Map(current.profiles.map((profile) => [profile.id, profile]));
  return parsed.profiles.map((profile) => {
    const shouldKeep = parsed.keepExistingApiKeys?.[profile.id] && !profile.apiKey;
    return {
      ...profile,
      apiKey: shouldKeep ? currentById.get(profile.id)?.apiKey : profile.apiKey,
    };
  });
}

export const aiSettingsService = {
  async getPublicSettings(): Promise<AiSettingsPublic> {
    return toPublicSettings(await readRawSettings());
  },

  async getRuntimeSettings(): Promise<AiSettings> {
    return readRawSettings();
  },

  async updateSettings(input: AiSettingsUpdate): Promise<AiSettingsPublic> {
    const current = await readRawSettings();
    const parsed = aiSettingsUpdateSchema.parse(input);
    const profiles = mergeProfileSecrets(current, parsed);
    const primary = profiles.find((profile) => profile.id === parsed.taskRoutes.text) ?? profiles[0];
    const next: AiSettings = {
      enabled: parsed.enabled,
      provider: primary.provider,
      baseUrl: primary.baseUrl ?? parsed.baseUrl,
      model: primary.model ?? parsed.model,
      profiles,
      taskRoutes: parsed.taskRoutes,
      timeoutMs: primary.timeoutMs ?? parsed.timeoutMs,
      apiKey: parsed.keepExistingApiKey ? current.apiKey : parsed.apiKey,
    };
    return toPublicSettings(await writeRawSettings(next));
  },

  async testConnection(input?: AiSettingsUpdate): Promise<{ ok: boolean; provider: string; message: string }> {
    const settings = input ? aiSettingsUpdateSchema.parse(input) : await readRawSettings();
    if (!settings.enabled) {
      return { ok: true, provider: 'mock', message: '真实 AI 未启用：当前使用内置 mock provider。' };
    }
    const routeProfileIds = Object.values(settings.taskRoutes).filter(Boolean) as string[];
    const profiles = settings.profiles.filter((profile) => routeProfileIds.includes(profile.id) && profile.enabled && profile.provider === 'openai-compatible');
    if (profiles.length === 0) {
      return { ok: true, provider: 'mock', message: '当前功能路由均未绑定真实 OpenAI-compatible 档案。' };
    }
    const profile = profiles[0];
    if (!profile.baseUrl || !profile.model || !profile.apiKey) {
      return { ok: false, provider: profile.provider, message: `模型档案「${profile.name}」缺少 Base URL、模型名或 API Key。` };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), profile.timeoutMs);
    try {
      const response = await fetch(`${profile.baseUrl.replace(/\/$/, '')}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${profile.apiKey}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        return { ok: false, provider: profile.provider, message: `模型档案「${profile.name}」连接失败：HTTP ${response.status}` };
      }
      return { ok: true, provider: profile.provider, message: `模型档案「${profile.name}」连接成功。` };
    } catch (error) {
      return { ok: false, provider: profile.provider, message: error instanceof Error ? `连接失败：${error.message}` : '连接失败' };
    } finally {
      clearTimeout(timeout);
    }
  },
};
