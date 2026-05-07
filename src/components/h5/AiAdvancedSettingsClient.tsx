'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Switch, Toast } from 'antd-mobile';
import type { AiProvider, AiSettingsPublic, AiTaskRoutes } from '@/features/settings/ai-settings-schema';
import { AI_TASKS, DEFAULT_DEEPSEEK_MODEL, DEFAULT_OPENAI_BASE_URL, DEFAULT_PROFILE_ID } from '@/features/settings/ai-settings-schema';

type ProfileForm = {
  id: string;
  name: string;
  enabled: boolean;
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  keepExistingApiKey: boolean;
  timeoutMs: number;
};

type FormState = {
  enabled: boolean;
  profiles: ProfileForm[];
  taskRoutes: Partial<Record<keyof AiTaskRoutes, string>>;
};

const TASK_LABELS: Record<(typeof AI_TASKS)[number], string> = {
  text: '通用文本兜底',
  'exam-analysis': '试卷错题分析',
  'practice-generation': '知识点练习出题',
  'monthly-exam': '月度错题卷生成',
  ocr: '图片/OCR 识别',
  audio: '语音/音频处理',
};

const DEFAULT_PROFILE: ProfileForm = {
  id: DEFAULT_PROFILE_ID,
  name: 'DeepSeek 文本模型',
  enabled: true,
  provider: 'openai-compatible',
  baseUrl: DEFAULT_OPENAI_BASE_URL,
  model: DEFAULT_DEEPSEEK_MODEL,
  apiKey: '',
  keepExistingApiKey: false,
  timeoutMs: 30000,
};

const MOCK_PROFILE: ProfileForm = {
  id: 'mock-fallback',
  name: 'Mock 兜底',
  enabled: true,
  provider: 'mock',
  baseUrl: '',
  model: 'mock',
  apiKey: '',
  keepExistingApiKey: false,
  timeoutMs: 30000,
};

function routeDefaults(profileId: string): FormState['taskRoutes'] {
  return {
    text: profileId,
    'exam-analysis': profileId,
    'practice-generation': profileId,
    'monthly-exam': profileId,
  };
}

function profileFromPublic(profile: AiSettingsPublic['profiles'][number]): ProfileForm {
  return {
    id: profile.id,
    name: profile.name,
    enabled: profile.enabled,
    provider: profile.provider,
    baseUrl: profile.baseUrl ?? '',
    model: profile.model ?? '',
    apiKey: '',
    keepExistingApiKey: profile.hasApiKey,
    timeoutMs: profile.timeoutMs,
  };
}

export function AiAdvancedSettingsClient() {
  const [form, setForm] = useState<FormState>({ enabled: false, profiles: [DEFAULT_PROFILE, MOCK_PROFILE], taskRoutes: routeDefaults(DEFAULT_PROFILE_ID) });
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
        const profiles = next.profiles.length > 0 ? next.profiles.map(profileFromPublic) : [DEFAULT_PROFILE, MOCK_PROFILE];
        setSettings(next);
        setForm({ enabled: next.enabled, profiles, taskRoutes: next.taskRoutes ?? routeDefaults(profiles[0].id) });
      })
      .catch((error) => Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '读取失败' }))
      .finally(() => setLoading(false));
  }, []);

  const profileOptions = useMemo(() => form.profiles.map((profile) => ({ id: profile.id, label: `${profile.name} · ${profile.provider}${profile.model ? ` · ${profile.model}` : ''}` })), [form.profiles]);
  const payload = useMemo(() => ({
    enabled: form.enabled,
    provider: 'mock' as const,
    baseUrl: DEFAULT_OPENAI_BASE_URL,
    model: DEFAULT_DEEPSEEK_MODEL,
    profiles: form.profiles.map((profile) => ({
      id: profile.id.trim(),
      name: profile.name.trim(),
      enabled: profile.enabled,
      provider: profile.provider,
      baseUrl: profile.baseUrl.trim(),
      model: profile.model.trim(),
      apiKey: profile.apiKey,
      timeoutMs: profile.timeoutMs,
    })),
    taskRoutes: form.taskRoutes,
    keepExistingApiKeys: Object.fromEntries(form.profiles.map((profile) => [profile.id, profile.keepExistingApiKey && !profile.apiKey])),
    timeoutMs: 30000,
  }), [form]);

  function updateProfile(index: number, patch: Partial<ProfileForm>) {
    setForm((current) => ({ ...current, profiles: current.profiles.map((profile, i) => (i === index ? { ...profile, ...patch } : profile)) }));
  }

  function addProfile() {
    const id = `profile-${Date.now().toString(36)}`;
    setForm((current) => ({
      ...current,
      profiles: [...current.profiles, { ...DEFAULT_PROFILE, id, name: '新模型档案', apiKey: '', keepExistingApiKey: false }],
    }));
  }

  function removeProfile(index: number) {
    setForm((current) => {
      if (current.profiles.length <= 1) return current;
      const removing = current.profiles[index];
      const nextProfiles = current.profiles.filter((_, i) => i !== index);
      const fallback = nextProfiles[0]?.id;
      const taskRoutes = Object.fromEntries(Object.entries(current.taskRoutes).map(([task, profileId]) => [task, profileId === removing.id ? fallback : profileId]));
      return { ...current, profiles: nextProfiles, taskRoutes };
    });
  }

  async function saveSettings() {
    setSaving(true);
    setTestMessage('');
    try {
      const response = await fetch('/api/settings/ai', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      const next = data.settings as AiSettingsPublic;
      setSettings(next);
      setForm((current) => ({ ...current, profiles: next.profiles.map(profileFromPublic), taskRoutes: next.taskRoutes }));
      Toast.show({ icon: 'success', content: 'AI 功能路由已保存' });
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
      const response = await fetch('/api/settings/ai/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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

  if (loading) return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">加载 AI 设置...</div>;

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 to-indigo-700 p-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Advanced</p>
        <h2 className="mt-2 text-2xl font-bold">AI 模型功能路由</h2>
        <p className="mt-2 text-sm leading-6 text-indigo-100">先建立多个模型档案，再把错题分析、练习出题、月度卷、OCR、音频等功能分别绑定到不同供应商和模型。</p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">启用真实 AI 路由</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">关闭时所有功能使用内置 mock。开启后按下方功能路由选择模型档案。</p>
          </div>
          <Switch checked={form.enabled} onChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))} />
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">模型档案</h3>
            <p className="mt-1 text-xs text-slate-500">每个档案包含独立供应商、Base URL、模型名、API Key 和超时。</p>
          </div>
          <Button size="small" fill="outline" onClick={addProfile}>新增</Button>
        </div>
        {form.profiles.map((profile, index) => (
          <div key={`${profile.id}-${index}`} className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm text-slate-800">{profile.name || '未命名档案'}</strong>
              <div className="flex items-center gap-2">
                <Switch checked={profile.enabled} onChange={(checked) => updateProfile(index, { enabled: checked })} />
                <Button size="mini" fill="none" color="danger" disabled={form.profiles.length <= 1} onClick={() => removeProfile(index)}>删除</Button>
              </div>
            </div>
            <Field label="档案 ID"><Input value={profile.id} onChange={(value) => updateProfile(index, { id: value })} /></Field>
            <Field label="档案名称"><Input value={profile.name} onChange={(value) => updateProfile(index, { name: value })} /></Field>
            <Field label="供应商">
              <select className="w-full bg-white text-sm outline-none" value={profile.provider} onChange={(event) => updateProfile(index, { provider: event.target.value as AiProvider })}>
                <option value="mock">Mock</option>
                <option value="openai-compatible">OpenAI 兼容</option>
              </select>
            </Field>
            <Field label="Base URL"><Input disabled={profile.provider === 'mock'} value={profile.baseUrl} placeholder={DEFAULT_OPENAI_BASE_URL} onChange={(value) => updateProfile(index, { baseUrl: value })} /></Field>
            <Field label="模型名"><Input disabled={profile.provider === 'mock'} value={profile.model} placeholder={DEFAULT_DEEPSEEK_MODEL} onChange={(value) => updateProfile(index, { model: value })} /></Field>
            <Field label="API Key" hint={settings?.profiles.find((item) => item.id === profile.id)?.hasApiKey ? `已保存：${settings.profiles.find((item) => item.id === profile.id)?.apiKeyMask}。留空沿用已有密钥。` : '不会回传给前端；留空表示该档案暂无密钥。'}>
              <Input type="password" disabled={profile.provider === 'mock'} value={profile.apiKey} placeholder="留空沿用已有密钥" onChange={(value) => updateProfile(index, { apiKey: value, keepExistingApiKey: !value && Boolean(settings?.profiles.find((item) => item.id === profile.id)?.hasApiKey) })} />
            </Field>
            <Field label="超时 ms"><Input type="number" value={String(profile.timeoutMs)} onChange={(value) => updateProfile(index, { timeoutMs: Number(value) || 30000 })} /></Field>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div>
          <h3 className="text-base font-bold text-slate-900">功能绑定</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">每个功能可以选择不同模型档案。例如：错题分析走 DeepSeek，OCR 走 Qwen-VL，音频走 Whisper。</p>
        </div>
        {AI_TASKS.map((task) => (
          <Field key={task} label={TASK_LABELS[task]}>
            <select className="w-full bg-white text-sm outline-none" value={form.taskRoutes[task] ?? ''} onChange={(event) => setForm((current) => ({ ...current, taskRoutes: { ...current.taskRoutes, [task]: event.target.value || undefined } }))}>
              <option value="">不绑定 / 使用 mock</option>
              {profileOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </Field>
        ))}
      </section>

      <section className="rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-100">
        <strong>设计说明：</strong>这里不再是单个全局模型，也不是简单 text/ocr/audio 能力拆分；而是“多个供应商/模型档案 + 功能路由”。API Key 仅保存在服务器本地 .data 文件。
      </section>

      {testMessage ? <section className="rounded-2xl bg-slate-900 p-4 text-sm text-white">{testMessage}</section> : null}

      <section className="grid grid-cols-2 gap-3">
        <Button block size="large" fill="outline" loading={testing} onClick={testConnection} className="!rounded-2xl">测试连接</Button>
        <Button block size="large" color="primary" loading={saving} onClick={saveSettings} className="!rounded-2xl">保存设置</Button>
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
