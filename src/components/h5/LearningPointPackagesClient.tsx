'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, DotLoading, TextArea, Toast } from 'antd-mobile';

type InstalledPackage = {
  grade: string;
  subject: string;
  version: string;
  path: string;
  textbookName: string;
  chapterCount: number;
  pointCount: number;
  updatedAt: string;
};

type PackageResponse = {
  catalogVersion: string;
  updatedAt: string;
  packageCount: number;
  packages: InstalledPackage[];
  sampleCatalog: unknown;
};

type UploadResult = {
  grade: string;
  subject: string;
  version: string;
  path: string;
  chapterCount: number;
  pointCount: number;
  replaced: boolean;
};

type ValidationState = { ok: boolean; title: string; lines: string[] } | null;

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function summarizeCatalog(value: unknown): ValidationState {
  if (!value || typeof value !== 'object') return { ok: false, title: '不是 JSON 对象', lines: ['请粘贴完整的 LearningPointCatalog v1 JSON 对象。'] };
  const catalog = value as Record<string, unknown>;
  const chapters = Array.isArray(catalog.chapters) ? catalog.chapters as Array<Record<string, unknown>> : [];
  const pointCount = chapters.reduce((sum, chapter) => sum + (Array.isArray(chapter.knowledgePoints) ? chapter.knowledgePoints.length : 0), 0);
  const grade = catalog.grade && typeof catalog.grade === 'object' ? (catalog.grade as Record<string, unknown>).name || (catalog.grade as Record<string, unknown>).code : undefined;
  const subject = catalog.subject && typeof catalog.subject === 'object' ? (catalog.subject as Record<string, unknown>).name || (catalog.subject as Record<string, unknown>).code : undefined;
  const textbook = catalog.textbook && typeof catalog.textbook === 'object' ? (catalog.textbook as Record<string, unknown>).name || (catalog.textbook as Record<string, unknown>).version : undefined;
  const issues: string[] = [];
  if (catalog.schemaVersion !== 'learning-point-catalog/v1') issues.push('schemaVersion 必须是 learning-point-catalog/v1');
  if (!grade) issues.push('缺少年级 grade');
  if (!subject) issues.push('缺少学科 subject');
  if (!textbook) issues.push('缺少教材 textbook');
  if (chapters.length === 0) issues.push('至少需要 1 个章节 chapters');
  if (pointCount === 0) issues.push('至少需要 1 个知识点 knowledgePoints');
  if (issues.length > 0) return { ok: false, title: '本地预检发现问题', lines: issues };
  return {
    ok: true,
    title: '本地预检通过，可上传到服务端做严格校验',
    lines: [`年级：${String(grade)}`, `学科：${String(subject)}`, `教材：${String(textbook)}`, `章节：${chapters.length}`, `知识点：${pointCount}`],
  };
}

export function LearningPointPackagesClient() {
  const [content, setContent] = useState('');
  const [replace, setReplace] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PackageResponse | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [validation, setValidation] = useState<ValidationState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupedPackages = useMemo(() => {
    const packages = summary?.packages ?? [];
    return packages.slice().sort((a, b) => `${a.grade}-${a.subject}`.localeCompare(`${b.grade}-${b.subject}`));
  }, [summary]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/learning-point-packages');
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
      const catalog = JSON.parse(content);
      const next = summarizeCatalog(catalog);
      setValidation(next);
      Toast.show({ icon: next?.ok ? 'success' : 'fail', content: next?.title });
      return catalog;
    } catch {
      const next = { ok: false, title: 'JSON 解析失败', lines: ['请检查引号、逗号、括号是否完整。'] };
      setValidation(next);
      Toast.show({ icon: 'fail', content: next.title });
      return null;
    }
  }

  async function submitPackage() {
    const catalog = validateContent();
    if (!catalog) return;
    setSaving(true);
    try {
      const response = await fetch('/api/learning-point-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog, replace }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '上传失败');
      setResult(data.package);
      Toast.show({ icon: 'success', content: data.package.replaced ? '知识点包已替换' : '知识点包已上传' });
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

  if (loading) return <div className="p-8 text-center text-slate-400"><DotLoading /> 读取知识点包...</div>;

  return (
    <div className="space-y-5 pb-10">
      <section className="rounded-[28px] bg-gradient-to-br from-indigo-600 to-sky-500 p-5 text-white shadow-sm">
        <div className="text-lg font-black">知识点包管理</div>
        <p className="mt-2 text-sm leading-6 text-white/85">面向内容运营的入口：先看当前覆盖，再导入 JSON，上传前可本地预检，上传后服务端会做严格 schema 校验。</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-lg font-black">{summary?.packageCount ?? 0}</div><div>已安装包</div></div>
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-lg font-black">G01-G09</div><div>年级范围</div></div>
          <div className="rounded-2xl bg-white/15 p-3"><div className="text-lg font-black">3</div><div>学科</div></div>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">当前内容覆盖</div>
            <div className="mt-1 text-xs text-slate-400">版本：{summary?.catalogVersion} · 更新：{summary?.updatedAt?.slice(0, 10)}</div>
          </div>
          <Button size="small" fill="outline" onClick={load}>刷新</Button>
        </div>
        <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
          {groupedPackages.map((item) => (
            <div key={`${item.grade}-${item.subject}-${item.version}`} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-slate-800">{item.grade} · {item.subject}</div>
                <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600">{item.version}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{item.textbookName}</div>
              <div className="mt-2 text-xs text-slate-400">章节 {item.chapterCount} · 知识点 {item.pointCount} · {item.path}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="text-sm font-black text-slate-900">导入 / 编辑 JSON</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">建议先下载样例，修改年级、学科、教材和知识点后再上传。替换开关只影响同年级/学科/版本的包。</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="small" fill="outline" onClick={() => { if (summary?.sampleCatalog) setContent(JSON.stringify(summary.sampleCatalog, null, 2)); }}>载入样例</Button>
          <Button size="small" fill="outline" onClick={() => { if (summary?.sampleCatalog) downloadJson('learning-point-catalog-sample.json', summary.sampleCatalog); }}>下载样例</Button>
          <Button size="small" fill="outline" onClick={() => fileInputRef.current?.click()}>选择 JSON 文件</Button>
          <Button size="small" fill="outline" onClick={() => { setContent(''); setValidation(null); }}>清空编辑区</Button>
        </div>
        <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} />
        <TextArea
          value={content}
          onChange={(value) => { setContent(value); setValidation(null); }}
          rows={14}
          placeholder='{"schemaVersion":"learning-point-catalog/v1", ...}'
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
          允许替换同年级 / 学科 / 版本的已有知识点包
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button block fill="outline" onClick={validateContent}>本地预检</Button>
          <Button block color="primary" loading={saving} onClick={submitPackage}>上传并生效</Button>
        </div>
      </section>

      {result ? (
        <section className="rounded-[28px] bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
          <div className="font-bold">上传结果</div>
          <div>年级：{result.grade} · 学科：{result.subject} · 版本：{result.version}</div>
          <div>章节：{result.chapterCount} · 知识点：{result.pointCount}</div>
          <div>文件：{result.path}</div>
          <div>{result.replaced ? '已替换旧版本索引' : '已新增版本索引'}</div>
        </section>
      ) : null}
    </div>
  );
}
