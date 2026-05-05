'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Dialog, DotLoading, ErrorBlock, Toast } from 'antd-mobile';
import type { ChildProfile } from '@/features/children/schema';
import { FixedActionBar } from './FixedActionBar';

export function ChildDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/children', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('孩子档案加载失败');
        const data = (await response.json()) as { children: ChildProfile[] };
        const found = data.children.find((item) => item.id === id) ?? null;
        if (!found) throw new Error('孩子档案不存在或已删除');
        setChild(found);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  async function deleteChild() {
    const confirmed = await Dialog.confirm({ content: '删除后不可恢复，确认删除这个孩子档案吗？', confirmText: '删除' });
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/children/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('删除失败，请稍后重试');
      Toast.show({ icon: 'success', content: '已删除孩子档案' });
      router.replace('/h5/children');
      router.refresh();
    } catch (err) {
      Toast.show({ icon: 'fail', content: err instanceof Error ? err.message : '删除失败' });
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">加载档案 <DotLoading /></div>;
  if (error || !child) return <ErrorBlock status="empty" title="无法查看档案" description={error ?? '孩子档案不存在'} />;

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-[28px] bg-gradient-to-br from-indigo-600 to-sky-500 p-5 text-white shadow-lg">
        <p className="text-sm opacity-80">孩子档案</p>
        <h1 className="mt-2 text-3xl font-bold">{child.name}</h1>
        <p className="mt-3 text-sm opacity-90">{child.age} 岁 · {child.grade} · {child.province}{child.city}</p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <InfoRow label="教材版本" value={child.textbookVersion} />
        <InfoRow label="所在地区" value={`${child.province}${child.city}`} />
        <InfoRow label="更新时间" value={new Date(child.updatedAt).toLocaleString('zh-CN')} />
      </section>

      <FixedActionBar>
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <Button block color="danger" fill="outline" size="large" loading={deleting} onClick={deleteChild} className="!rounded-2xl">删除</Button>
          <Link href={`/h5/children/${child.id}/edit`}>
            <Button block color="primary" size="large" className="!rounded-2xl">编辑</Button>
          </Link>
        </div>
      </FixedActionBar>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
