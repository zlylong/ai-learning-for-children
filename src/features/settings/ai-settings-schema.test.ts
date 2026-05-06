import { describe, expect, it } from 'vitest';
import { aiSettingsSchema, aiSettingsUpdateSchema, DEFAULT_DEEPSEEK_MODEL, DEFAULT_OPENAI_BASE_URL } from './ai-settings-schema';

const validOpenAiConfig = {
  enabled: true,
  provider: 'openai-compatible' as const,
  baseUrl: 'https://api.example.com/v1',
  model: 'gpt-test',
  models: {
    text: 'deepseek-chat',
    ocr: 'gpt-ocr',
    audio: 'gpt-audio',
    examAnalysis: 'gpt-analysis',
    practiceGeneration: 'gpt-practice',
    monthlyExam: 'gpt-monthly',
  },
  apiKey: 'sk-test-not-real',
  timeoutMs: 30000,
};

describe('aiSettingsSchema', () => {
  it('allows disabled mock settings without secrets', () => {
    const parsed = aiSettingsSchema.parse({ enabled: false, provider: 'mock', timeoutMs: 30000 });
    expect(parsed).toMatchObject({ enabled: false, provider: 'mock' });
    expect(parsed.apiKey).toBeUndefined();
  });

  it('uses DeepSeek OpenAI-compatible defaults when real provider is enabled', () => {
    const parsed = aiSettingsSchema.parse({ enabled: true, provider: 'openai-compatible', timeoutMs: 30000 });
    expect(parsed.baseUrl).toBe(DEFAULT_OPENAI_BASE_URL);
    expect(parsed.model).toBe(DEFAULT_DEEPSEEK_MODEL);
    expect(parsed.models.text).toBe(DEFAULT_DEEPSEEK_MODEL);
  });

  it('accepts OpenAI-compatible settings and trims blank apiKey to undefined', () => {
    const parsed = aiSettingsUpdateSchema.parse({ ...validOpenAiConfig, apiKey: '' });
    expect(parsed.apiKey).toBeUndefined();
    expect(parsed.baseUrl).toBe('https://api.example.com/v1');
  });

  it('allows ocr/audio/text models to be configured independently', () => {
    const parsed = aiSettingsSchema.parse({
      enabled: true,
      provider: 'openai-compatible',
      baseUrl: 'https://api.example.com/v1',
      model: '',
      models: { text: 'deepseek-chat', ocr: 'gpt-ocr', audio: 'gpt-audio' },
      timeoutMs: 30000,
    });
    expect(parsed.model).toBe(DEFAULT_DEEPSEEK_MODEL);
    expect(parsed.models.text).toBe('deepseek-chat');
    expect(parsed.models.ocr).toBe('gpt-ocr');
    expect(parsed.models.audio).toBe('gpt-audio');
  });
});
