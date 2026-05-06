import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { aiSettingsSchema, aiSettingsUpdateSchema, type AiSettings, type AiSettingsPublic, type AiSettingsUpdate } from './ai-settings-schema';

const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: 'mock',
  baseUrl: undefined,
  model: undefined,
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
    timeoutMs: settings.timeoutMs,
    hasApiKey: Boolean(settings.apiKey),
    apiKeyMask: maskApiKey(settings.apiKey),
    updatedAt: settings.updatedAt,
  };
}

async function readRawSettings(): Promise<AiSettings> {
  try {
    const content = await readFile(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    return aiSettingsSchema.extend({ updatedAt: z.string().optional() }).parse(parsed) as AiSettings;
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
    const next: AiSettings = {
      enabled: parsed.enabled,
      provider: parsed.provider,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      timeoutMs: parsed.timeoutMs,
      apiKey: parsed.keepExistingApiKey ? current.apiKey : parsed.apiKey,
    };
    return toPublicSettings(await writeRawSettings(next));
  },

  async testConnection(input?: AiSettingsUpdate): Promise<{ ok: boolean; provider: string; message: string }> {
    const settings = input ? aiSettingsUpdateSchema.parse(input) : await readRawSettings();
    if (settings.provider === 'mock' || !settings.enabled) {
      return { ok: true, provider: 'mock', message: 'Mock AI 可用：当前不会调用真实外部模型。' };
    }

    if (!settings.baseUrl || !settings.model || !settings.apiKey) {
      return { ok: false, provider: settings.provider, message: '请先填写 Base URL、模型名称和 API Key。' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${settings.apiKey}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        return { ok: false, provider: settings.provider, message: `连接失败：HTTP ${response.status}` };
      }
      return { ok: true, provider: settings.provider, message: '连接成功，模型服务可访问。' };
    } catch (error) {
      return { ok: false, provider: settings.provider, message: error instanceof Error ? `连接失败：${error.message}` : '连接失败' };
    } finally {
      clearTimeout(timeout);
    }
  },
};
