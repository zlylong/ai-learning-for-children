import { describe, expect, it } from 'vitest';
import { aiSettingsSchema, aiSettingsUpdateSchema } from './ai-settings-schema';

const validOpenAiConfig = {
  enabled: true,
  provider: 'openai-compatible' as const,
  baseUrl: 'https://api.example.com/v1',
  model: 'gpt-test',
  models: {
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

  it('requires baseUrl and model when real provider is enabled', () => {
    const parsed = aiSettingsSchema.safeParse({ enabled: true, provider: 'openai-compatible', timeoutMs: 30000 });
    expect(parsed.success).toBe(false);
  });

  it('accepts OpenAI-compatible settings and trims blank apiKey to undefined', () => {
    const parsed = aiSettingsUpdateSchema.parse({ ...validOpenAiConfig, apiKey: '' });
    expect(parsed.apiKey).toBeUndefined();
    expect(parsed.baseUrl).toBe('https://api.example.com/v1');
  });

  it('allows per-task models without a default model', () => {
    const parsed = aiSettingsSchema.parse({
      enabled: true,
      provider: 'openai-compatible',
      baseUrl: 'https://api.example.com/v1',
      models: { examAnalysis: 'gpt-analysis' },
      timeoutMs: 30000,
    });
    expect(parsed.model).toBeUndefined();
    expect(parsed.models.examAnalysis).toBe('gpt-analysis');
  });
});
