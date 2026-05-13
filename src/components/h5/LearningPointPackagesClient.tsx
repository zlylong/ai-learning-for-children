'use client';

import { useState } from 'react';
import { Button, Checkbox, TextArea, Toast } from 'antd-mobile';

type UploadResult = {
  grade: string;
  subject: string;
  version: string;
  path: string;
  chapterCount: number;
  pointCount: number;
  replaced: boolean;
};

export function LearningPointPackagesClient() {
  const [content, setContent] = useState('');
  const [replace, setReplace] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function submitPackage() {
    let catalog: unknown;
    try {
      catalog = JSON.parse(content);
    } catch {
      Toast.show({ icon: 'fail', content: '请输入合法 JSON' });
      return;
    }
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
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '上传失败' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
        <div className="text-lg font-black text-slate-900">知识点包运营</div>
        <p className="mt-2 text-sm leading-6 text-slate-500">粘贴符合 LearningPointCatalog v1 的 JSON。系统会校验 schema，并按年级/学科/教材版本写入版本化文件。</p>
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="mb-3 text-sm font-bold text-slate-900">Catalog JSON</div>
        <TextArea
          value={content}
          onChange={setContent}
          rows={12}
          placeholder='{"schemaVersion":"learning-point-catalog/v1", ...}'
          className="rounded-2xl bg-slate-50 p-3"
        />
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Checkbox checked={replace} onChange={(checked) => setReplace(Boolean(checked))} />
          允许替换同年级/学科/版本的已有知识点包
        </label>
        <Button block color="primary" loading={saving} className="mt-4 !rounded-2xl" onClick={submitPackage}>
          上传并校验
        </Button>
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
