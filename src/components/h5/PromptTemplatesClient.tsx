'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Checkbox, DotLoading, TextArea, Toast } from 'antd-mobile';

type PromptSummary = {
  id: string;
  name: string;
  description: string;
  task: string;
  learningPointMode: { enabled: boolean; maxPoints: number; includeFields: string[] };
};

type PromptTemplateResponse = {
  packVersion: string;
  updatedAt: string;
  source: 'builtin' | 'custom';
  templates: PromptSummary[];
  defaultPack: unknown;
};

type UploadResult = { packVersion: string; templateCount: number; updatedAt: string };

export function PromptTemplatesClient() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PromptTemplateResponse | null>(null);
  const [content, setContent] = useState('');
  const [replace, setReplace] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompt-templates');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '读取失败');
      setSummary(data);
      setContent((current) => current || JSON.stringify(data.defaultPack, null, 2));
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '读取失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submitPackage() {
    let pack: unknown;
    try {
      pack = JSON.parse(content);
    } catch {
      Toast.show({ icon: 'fail', content: '请输入合法 JSON' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/prompt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack, replace }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '上传失败');
      setResult(data.package);
      Toast.show({ icon: 'success', content: '提示词包已生效' });
      await load();
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '上传失败' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400"><DotLoading /> 读取提示词包...</div>;

  return (
    <div className="space-y-5 pb-10">
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
        <div className="text-lg font-black text-slate-900">提示词包运营</div>
        <p className="mt-2 text-sm leading-6 text-slate-500">提示词现在与 Learning Points 一样采用可上传 JSON 包模式。练习生成、错题诊断、月度复习卷都会读取当前生效包，并把匹配的 Learning Points 作为上下文注入。</p>
        {summary ? <p className="mt-3 text-xs text-slate-400">当前来源：{summary.source === 'custom' ? '自定义包' : '内置默认包'} · 版本：{summary.packVersion}</p> : null}
      </section>

      <section className="space-y-3">
        {summary?.templates.map((template) => (
          <div key={template.id} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
            <div className="text-sm font-black text-slate-900">{template.name}</div>
            <div className="mt-1 text-xs text-indigo-500">{template.id} · {template.task}</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p>
            <div className="mt-2 text-xs text-slate-400">Learning Points：{template.learningPointMode.enabled ? `开启，最多 ${template.learningPointMode.maxPoints} 个字段上下文` : '关闭'}</div>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="mb-3 text-sm font-bold text-slate-900">PromptTemplatePack JSON</div>
        <TextArea value={content} onChange={setContent} rows={14} className="rounded-2xl bg-slate-50 p-3" />
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Checkbox checked={replace} onChange={(checked) => setReplace(Boolean(checked))} />
          允许替换当前自定义提示词包
        </label>
        <Button block color="primary" loading={saving} className="mt-4 !rounded-2xl" onClick={submitPackage}>
          上传并生效
        </Button>
      </section>

      {result ? (
        <section className="rounded-[28px] bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
          <div className="font-bold">上传结果</div>
          <div>版本：{result.packVersion}</div>
          <div>模板数：{result.templateCount}</div>
          <div>更新时间：{result.updatedAt}</div>
        </section>
      ) : null}
    </div>
  );
}
