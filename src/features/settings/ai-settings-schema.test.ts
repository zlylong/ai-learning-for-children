import { describe, expect, it } from 'vitest';
import { aiSettingsSchema, aiSettingsUpdateSchema, DEFAULT_DEEPSEEK_MODEL, DEFAULT_OPENAI_BASE_URL } from './ai-settings-schema';

const deepseekProfile = {
  id: 'deepseek-text',
  name: 'DeepSeek 文本',
  enabled: true,
  provider: 'openai-compatible' as const,
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  apiKey: 'x',
  timeoutMs: 30000,
};

const mockProfile = {
  id: 'mock-fallback',
  name: 'Mock 兜底',
  enabled: true,
  provider: 'mock' as const,
  baseUrl: '',
  model: 'mock',
  apiKey: '',
  timeoutMs: 30000,
};

describe('aiSettingsSchema', () => {
  it('keeps disabled mock settings usable without secrets', () => {
    const parsed = aiSettingsSchema.parse({ enabled: false, provider: 'mock', timeoutMs: 30000 });
    expect(parsed).toMatchObject({ enabled: false, provider: 'mock' });
    expect(parsed.profiles.length).toBeGreaterThan(0);
    expect(parsed.taskRoutes['exam-analysis']).toBeTruthy();
  });

  it('migrates legacy provider/model settings into a default text profile', () => {
    const parsed = aiSettingsSchema.parse({ enabled: true, provider: 'openai-compatible', baseUrl: DEFAULT_OPENAI_BASE_URL, model: DEFAULT_DEEPSEEK_MODEL, timeoutMs: 30000 });
    expect(parsed.profiles[0]).toMatchObject({ provider: 'openai-compatible', baseUrl: DEFAULT_OPENAI_BASE_URL, model: DEFAULT_DEEPSEEK_MODEL });
    expect(parsed.taskRoutes['exam-analysis']).toBe(parsed.profiles[0].id);
    expect(parsed.taskRoutes['practice-generation']).toBe(parsed.profiles[0].id);
    expect(parsed.taskRoutes['monthly-exam']).toBe(parsed.profiles[0].id);
  });

  it('allows each product function to choose a different provider/model profile', () => {
    const parsed = aiSettingsUpdateSchema.parse({
      enabled: true,
      provider: 'mock',
      baseUrl: '',
      model: '',
      profiles: [deepseekProfile, { ...deepseekProfile, id: 'qwen-ocr', name: 'Qwen OCR', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-vl-plus' }, mockProfile],
      taskRoutes: {
        'exam-analysis': 'deepseek-text',
        'practice-generation': 'deepseek-text',
        'monthly-exam': 'mock-fallback',
        ocr: 'qwen-ocr',
        audio: 'mock-fallback',
        text: 'deepseek-text',
      },
      timeoutMs: 30000,
    });
    expect(parsed.profiles.map((item) => item.id)).toEqual(['deepseek-text', 'qwen-ocr', 'mock-fallback']);
    expect(parsed.taskRoutes.ocr).toBe('qwen-ocr');
    expect(parsed.taskRoutes['monthly-exam']).toBe('mock-fallback');
  });

  it('rejects routes pointing to unknown profiles', () => {
    const parsed = aiSettingsUpdateSchema.safeParse({
      enabled: true,
      profiles: [deepseekProfile],
      taskRoutes: { 'exam-analysis': 'missing-profile' },
      timeoutMs: 30000,
    });
    expect(parsed.success).toBe(false);
  });
});
