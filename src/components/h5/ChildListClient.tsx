'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, DotLoading, ErrorBlock, PullToRefresh } from 'antd-mobile';
import type { ChildProfile } from '@/features/children/schema';
import { FixedActionBar } from './FixedActionBar';

type ChildrenResponse = {
  children: ChildProfile[];
};

export function ChildListClient() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadChildren() {
    setError(null);
    const response = await fetch('/api/children', { cache: 'no-store' });
    if (!response.ok) throw new Error('孩子档案加载失败');
    const data = (await response.json()) as ChildrenResponse;
    setChildren(data.children);
  }

  useEffect(() => {
    loadChildren().catch((err: unknown) => setError(err instanceof Error ? err.message : '加载失败')).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">加载孩子档案 <DotLoading /></div>;
  }

  if (error) {
    return <ErrorBlock status="busy" title="加载失败" description={error} />;
  }

  return (
    <>
      <PullToRefresh onRefresh={loadChildren}>
        <div className="space-y-3 pb-24">
          {children.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
              <div className="text-4xl">🧒</div>
              <h2 className="mt-3 text-lg font-bold text-slate-950">还没有孩子档案</h2>
              <p className="mt-2 text-sm text-slate-500">先创建一个孩子档案，再开始学习诊断。</p>
            </div>
          ) : (
            children.map((child) => <ChildCard key={child.id} child={child} />)
          )}
        </div>
      </PullToRefresh>

      <FixedActionBar>
        <Link href="/h5/children/new">
          <Button block color="primary" size="large" className="!rounded-2xl">新增孩子档案</Button>
        </Link>
      </FixedActionBar>
    </>
  );
}

function ChildCard({ child }: { child: ChildProfile }) {
  return (
    <Link href={`/h5/children/${child.id}`} className="block rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">🧒</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-lg font-bold text-slate-950">{child.name}</h2>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-600">{child.grade}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{child.age} 岁 · {child.province}{child.city}</p>
          <p className="mt-1 text-sm text-slate-500">教材：{child.textbookVersion}</p>
        </div>
      </div>
    </Link>
  );
}
