'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Selector, Switch, Toast } from 'antd-mobile';
import type { AiSettingsPublic, AiProvider } from '@/features/settings/ai-settings-schema';
import { DEFAULT_DEEPSEEK_MODEL, DEFAULT_OPENAI_BASE_URL } from '@/features/settings/ai-settings-schema';

type FormState = {
  enabled: boolean;
  provider: AiProvider;
  baseUrl: string;
  model: string;
  models: {
    text: string;
    ocr: string;
    audio: string;
    examAnalysis: string;
    practiceGeneration: string;
    monthlyExam: string;
  };
  apiKey: string;
  keepExistingApiKey: boolean;
  timeoutMs: number;
};

const DEFAULT_FORM: FormState = {
  enabled: false,
  provider: 'mock',
  baseUrl: DEFAULT_OPENAI_BASE_URL,
  model: DEFAULT_DEEPSEEK_MODEL,
  models: {
    text: DEFAULT_DEEPSEEK_MODEL,
    ocr: '',
    audio: '',
    examAnalysis: '',
    practiceGeneration: '',
    monthlyExam: '',
  },
  apiKey: '',
  keepExistingApiKey: true,
  timeoutMs: 30000,
};

export function AiAdvancedSettingsClient() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [settings, setSettings] = useState<AiSettingsPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string>('');

  useEffect(() => {
    fetch('/api/settings/ai', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('读取 AI 设置失败');
        return (await response.json()) as { settings: AiSettingsPublic };
      })
      .then(({ settings: next }) => {
        setSettings(next);
        setForm({
          enabled: next.enabled,
          provider: next.provider,
          baseUrl: next.baseUrl ?? DEFAULT_OPENAI_BASE_URL,
          model: next.model ?? DEFAULT_DEEPSEEK_MODEL,
          models: {
            text: next.models?.text ?? next.model ?? DEFAULT_DEEPSEEK_MODEL,
            ocr: next.models?.ocr ?? '',
            audio: next.models?.audio ?? '',
            examAnalysis: next.models?.examAnalysis ?? '',
            practiceGeneration: next.models?.practiceGeneration ?? '',
            monthlyExam: next.models?.monthlyExam ?? '',
          },
          apiKey: '',
          keepExistingApiKey: next.hasApiKey,
          timeoutMs: next.timeoutMs,
        });
      })
      .catch((error) => Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '读取失败' }))
      .finally(() => setLoading(false));
  }, []);

  const isRealProvider = form.provider === 'openai-compatible';
  const canUseExistingKey = Boolean(settings?.hasApiKey) && form.keepExistingApiKey && !form.apiKey;
  const payload = useMemo(() => ({
    enabled: form.enabled,
    provider: form.provider,
    baseUrl: form.baseUrl,
    model: form.model,
    models: form.models,
    apiKey: form.apiKey,
    keepExistingApiKey: canUseExistingKey,
    timeoutMs: form.timeoutMs,
  }), [canUseExistingKey, form]);

  async function saveSettings() {
    setSaving(true);
    setTestMessage('');
    try {
      const response = await fetch('/api/settings/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      const next = data.settings as AiSettingsPublic;
      setSettings(next);
      setForm((current) => ({ ...current, apiKey: '', keepExistingApiKey: next.hasApiKey }));
      Toast.show({ icon: 'success', content: 'AI 设置已保存' });
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestMessage('');
    try {
      const response = await fetch('/api/settings/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      const message = data.message || data.error || '测试完成';
      setTestMessage(message);
      Toast.show({ icon: response.ok ? 'success' : 'fail', content: message });
    } catch (error) {
      const message = error instanceof Error ? error.message : '测试失败';
      setTestMessage(message);
      Toast.show({ icon: 'fail', content: message });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">加载 AI 设置...</div>;
  }

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 to-indigo-700 p-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Advanced</p>
        <h2 className="mt-2 text-2xl font-bold">AI 对接设置</h2>
        <p className="mt-2 text-sm leading-6 text-indigo-100">配置真实模型服务时，所有分析、出题和复习卷生成仍统一走后端 AI Client，并继续做 Zod 输出校验。</p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">启用真实 AI</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">关闭时使用内置 mock provider，适合演示和离线开发。</p>
          </div>
          <Switch checked={form.enabled} onChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))} />
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Provider</label>
          <Selector
            options={[
              { label: 'Mock', value: 'mock' },
              { label: 'OpenAI 兼容', value: 'openai-compatible' },
            ]}
            value={[form.provider]}
            onChange={(value) => setForm((current) => ({ ...current, provider: (value[0] as AiProvider) ?? 'mock' }))}
          />
        </div>

        <Field label="Base URL" hint="默认使用 DeepSeek 的 OpenAI-compatible base_url，也可替换为其他 /v1 兼容地址。">
          <Input
            clearable
            disabled={!isRealProvider}
            placeholder={DEFAULT_OPENAI_BASE_URL}
            value={form.baseUrl}
            onChange={(value) => setForm((current) => ({ ...current, baseUrl: value }))}
          />
        </Field>

        <Field label="默认模型" hint="兜底模型。下方业务模型留空时，会使用默认模型。">
          <Input
            clearable
            disabled={!isRealProvider}
            placeholder={DEFAULT_DEEPSEEK_MODEL}
            value={form.model}
            onChange={(value) => setForm((current) => ({ ...current, model: value }))}
          />
        </Field>

        <div className="space-y-3 rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
          <div>
            <h4 className="text-sm font-bold text-indigo-900">按业务需求拆分模型</h4>
            <p className="mt-1 text-xs leading-5 text-indigo-700">可把文本、OCR、音频和具体业务分别接到不同模型；留空则回退到文本模型/默认模型。</p>
          </div>
          <Field label="文本模型" hint="通用文本 JSON 生成兜底模型，默认 deepseek-chat。">
            <Input
              clearable
              disabled={!isRealProvider}
              placeholder={DEFAULT_DEEPSEEK_MODEL}
              value={form.models.text}
              onChange={(value) => setForm((current) => ({ ...current, models: { ...current.models, text: value } }))}
            />
          </Field>
          <Field label="OCR 模型" hint="预留给图片试卷识别；留空时回退到文本模型。">
            <Input
              clearable
              disabled={!isRealProvider}
              placeholder="例如：gpt-4o / qwen-vl-plus"
              value={form.models.ocr}
              onChange={(value) => setForm((current) => ({ ...current, models: { ...current.models, ocr: value } }))}
            />
          </Field>
          <Field label="音频模型" hint="预留给语音/音频输入识别或讲解；留空时回退到文本模型。">
            <Input
              clearable
              disabled={!isRealProvider}
              placeholder="例如：whisper-1 / gpt-4o-mini-transcribe"
              value={form.models.audio}
              onChange={(value) => setForm((current) => ({ ...current, models: { ...current.models, audio: value } }))}
            />
          </Field>
          <Field label="错题分析模型" hint="用于上传试卷后的错题识别、知识点匹配。">
            <Input
              clearable
              disabled={!isRealProvider}
              placeholder="例如：qwen-plus / gpt-4o"
              value={form.models.examAnalysis}
              onChange={(value) => setForm((current) => ({ ...current, models: { ...current.models, examAnalysis: value } }))}
            />
          </Field>
          <Field label="练习出题模型" hint="用于根据知识点生成 5 题练习。">
            <Input
              clearable
              disabled={!isRealProvider}
              placeholder="例如：deepseek-chat / gpt-4o-mini"
              value={form.models.practiceGeneration}
              onChange={(value) => setForm((current) => ({ ...current, models: { ...current.models, practiceGeneration: value } }))}
            />
          </Field>
          <Field label="月度卷模型" hint="用于月度错题卷、长期薄弱点专项等复习卷生成。">
            <Input
              clearable
              disabled={!isRealProvider}
              placeholder="例如：gpt-4o / qwen-max"
              value={form.models.monthlyExam}
              onChange={(value) => setForm((current) => ({ ...current, models: { ...current.models, monthlyExam: value } }))}
            />
          </Field>
        </div>

        <Field label="API Key" hint={settings?.hasApiKey ? `已保存：${settings.apiKeyMask}。留空将沿用已有密钥。` : '仅保存在服务器本地 .data 文件，不会返回给前端。'}>
          <Input
            clearable
            disabled={!isRealProvider}
            type="password"
            placeholder={settings?.hasApiKey ? '留空沿用已有密钥' : '请输入 API Key'}
            value={form.apiKey}
            onChange={(value) => setForm((current) => ({ ...current, apiKey: value, keepExistingApiKey: !value && Boolean(settings?.hasApiKey) }))}
          />
        </Field>

        <Field label="超时时间" hint="单位毫秒，建议 30000-60000。">
          <Input
            clearable
            type="number"
            value={String(form.timeoutMs)}
            onChange={(value) => setForm((current) => ({ ...current, timeoutMs: Number(value) || 30000 }))}
          />
        </Field>
      </section>

      <section className="rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-100">
        <strong>安全提示：</strong>后端 API 不会把完整 API Key 返回前端；提交代码前会扫描密钥。当前页面适合开发/测试环境，生产环境建议改为 KMS 或环境变量托管。
      </section>

      {testMessage ? <section className="rounded-2xl bg-slate-900 p-4 text-sm text-white">{testMessage}</section> : null}

      <section className="grid grid-cols-2 gap-3">
        <Button block size="large" fill="outline" loading={testing} onClick={testConnection} className="!rounded-2xl">
          测试连接
        </Button>
        <Button block size="large" color="primary" loading={saving} onClick={saveSettings} className="!rounded-2xl">
          保存设置
        </Button>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">{children}</div>
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}
