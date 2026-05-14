'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
type ValidationState = { ok: boolean; title: string; lines: string[] } | null;

const requiredTemplateIds = ['analyze-wrong-questions', 'generate-practice-questions', 'generate-monthly-wrong-set-exam'];

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function summarizePromptPack(value: unknown): ValidationState {
  if (!value || typeof value !== 'object') return { ok: false, title: '不是 JSON 对象', lines: ['请粘贴完整的 PromptTemplatePack v1 JSON 对象。'] };
  const pack = value as Record<string, unknown>;
  const templates = Array.isArray(pack.templates) ? pack.templates as Array<Record<string, unknown>> : [];
  const ids = templates.map((template) => String(template.id || ''));
  const issues: string[] = [];
  if (pack.schemaVersion !== 'prompt-template-pack/v1') issues.push('schemaVersion 必须是 prompt-template-pack/v1');
  if (!pack.packVersion) issues.push('缺少 packVersion');
  if (templates.length === 0) issues.push('至少需要 1 个模板 templates');
  for (const template of templates) {
    if (!template.id) issues.push('有模板缺少 id');
    if (!template.systemRole) issues.push(`${template.id || '未知模板'} 缺少 systemRole`);
    if (!template.objective) issues.push(`${template.id || '未知模板'} 缺少 objective`);
    if (!Array.isArray(template.rules) || template.rules.length === 0) issues.push(`${template.id || '未知模板'} 缺少 rules`);
    if (!template.outputContract) issues.push(`${template.id || '未知模板'} 缺少 outputContract`);
  }
  const missing = requiredTemplateIds.filter((id) => !ids.includes(id));
  const warnings = missing.map((id) => `未包含 ${id}，系统会回退到内置默认模板`);
  if (issues.length > 0) return { ok: false, title: '本地预检发现问题', lines: [...issues, ...warnings] };
  return {
    ok: true,
    title: '本地预检通过，可上传到服务端做严格校验',
    lines: [`版本：${String(pack.packVersion)}`, `模板数：${templates.length}`, ...warnings],
  };
}

export function PromptTemplatesClient() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PromptTemplateResponse | null>(null);
  const [content, setContent] = useState('');
  const [replace, setReplace] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [validation, setValidation] = useState<ValidationState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const learningPointFieldCount = useMemo(() => {
    const fields = new Set<string>();
    summary?.templates.forEach((template) => template.learningPointMode.includeFields.forEach((field) => fields.add(field)));
    return fields.size;
  }, [summary]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompt-templates');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '读取失败');
      setSummary(data);
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '读取失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function validateContent() {
    try {
      const pack = JSON.parse(content);
      const next = summarizePromptPack(pack);
      setValidation(next);
      Toast.show({ icon: next?.ok ? 'success' : 'fail', content: next?.title });
      return pack;
    } catch {
      const next = { ok: false, title: 'JSON 解析失败', lines: ['请检查引号、逗号、括号是否完整。'] };
      setValidation(next);
      Toast.show({ icon: 'fail', content: next.title });
      return null;
    }
  }

  async function submitPackage() {
    const pack = validateContent();
    if (!pack) return;
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

  async function importFile(file?: File) {
    if (!file) return;
    const text = await file.text();
    setContent(text);
    setValidation(null);
    Toast.show({ icon: 'success', content: `已载入 ${file.name}` });
  }

  if (loading) return <div className="p-8 text-center text-slate-400"><DotLoading /> 读取提示词包...</div>;

  return (
    <div className="space-y-5 pb-10">
      <section className="rounded-[28px] bg-gradient-to-br from-violet-600 to-indigo-500 p-5 text-white shadow-sm">
        <div className="text-lg font-black">提示词包管理</div>
        <p className="mt-2 text-sm leading-6 text-white/85">这里管理“AI 怎么问”。提示词包会和当前 Learning Points 一起渲染，影响错题诊断、专项练习、月度错题卷三个 AI 功能。</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-lg font-black">{summary?.templates.length ?? 0}</div><div>模板</div></div>
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-lg font-black">{learningPointFieldCount}</div><div>LP 字段</div></div>
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-lg font-black">{summary?.source === 'custom' ? '自定义' : '内置'}</div><div>来源</div></div>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">当前生效模板</div>
            <div className="mt-1 text-xs text-slate-400">版本：{summary?.packVersion} · 更新：{summary?.updatedAt?.slice(0, 10)}</div>
          </div>
          <Button size="small" fill="outline" onClick={load}>刷新</Button>
        </div>
        <div className="mt-4 space-y-3">
          {summary?.templates.map((template) => (
            <div key={template.id} className="rounded-[24px] bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">{template.name}</div>
                  <div className="mt-1 text-xs text-indigo-500">{template.id} · {template.task}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${template.learningPointMode.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{template.learningPointMode.enabled ? 'LP 已注入' : 'LP 关闭'}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p>
              <div className="mt-2 text-xs leading-5 text-slate-400">最多 {template.learningPointMode.maxPoints} 个 Learning Points；字段：{template.learningPointMode.includeFields.join('、')}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="text-sm font-black text-slate-900">导入 / 编辑 JSON</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">建议先下载默认包，在默认包基础上改写 systemRole、objective、rules、outputContract。上传前可本地预检；上传后服务端会用 schema 严格校验。</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="small" fill="outline" onClick={() => { if (summary?.defaultPack) setContent(JSON.stringify(summary.defaultPack, null, 2)); }}>载入默认包</Button>
          <Button size="small" fill="outline" onClick={() => { if (summary?.defaultPack) downloadJson('prompt-template-pack-default.json', summary.defaultPack); }}>下载默认包</Button>
          <Button size="small" fill="outline" onClick={() => fileInputRef.current?.click()}>选择 JSON 文件</Button>
          <Button size="small" fill="outline" onClick={() => { setContent(''); setValidation(null); }}>清空编辑区</Button>
        </div>
        <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} />
        <TextArea
          value={content}
          onChange={(value) => { setContent(value); setValidation(null); }}
          rows={10}
          placeholder='点击“载入默认包”或选择 JSON 文件后再编辑。'
          className="mt-4 rounded-2xl bg-slate-50 p-3 font-mono text-xs"
        />
        {validation ? (
          <div className={`mt-3 rounded-2xl p-3 text-xs leading-5 ${validation.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
            <div className="font-bold">{validation.title}</div>
            {validation.lines.map((line) => <div key={line}>· {line}</div>)}
          </div>
        ) : null}
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Checkbox checked={replace} onChange={(checked) => setReplace(Boolean(checked))} />
          允许替换当前自定义提示词包
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button block fill="outline" onClick={validateContent}>本地预检</Button>
          <Button block color="primary" loading={saving} onClick={submitPackage}>上传并生效</Button>
        </div>
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
