'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, DotLoading, ErrorBlock, PullToRefresh, Avatar } from 'antd-mobile';
import { UserOutline, AddOutline } from 'antd-mobile-icons';
import type { ChildProfile } from '@/features/children/schema';
import { SafeAreaActionBar } from './SafeAreaActionBar';

type ChildrenResponse = {
  children: ChildProfile[];
};

export function ChildListClient({ mode = 'list' }: { mode?: 'list' | 'select' }) {
  const router = useRouter();
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

  const handleSelect = (id: string) => {
    localStorage.setItem('selectedChildId', id);
    if (mode === 'select') {
      router.push('/h5');
    } else {
      router.push(`/h5/children/${id}`);
    }
  };

  if (loading) {
    return <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">加载孩子档案 <DotLoading /></div>;
  }

  if (error) {
    return <ErrorBlock status="busy" title="加载失败" description={error} />;
  }

  return (
    <>
      <PullToRefresh onRefresh={loadChildren}>
        <div className="space-y-4 pb-24">
          {children.length === 0 ? (
            <div className="rounded-[32px] bg-white p-12 text-center shadow-sm ring-1 ring-black/[0.04]">
              <div className="text-6xl mb-4">🧸</div>
              <h2 className="text-xl font-bold text-slate-900">还没有孩子档案</h2>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                创建一个孩子档案，<br />开启 AI 学习成长之旅。
              </p>
              <Link href="/h5/children/new" className="mt-8 block">
                <Button color="primary" shape="rounded" className="px-8">去创建</Button>
              </Link>
            </div>
          ) : (
            children.map((child) => (
               <div 
                key={child.id} 
                onClick={() => handleSelect(child.id)}
                className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04] active:bg-slate-50 transition-all"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                   <UserOutline fontSize={28} />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-slate-900">{child.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{child.grade} · {child.age}岁</div>
                </div>
                {mode === 'select' && (
                  <div className="rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                    选择
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </PullToRefresh>

      <SafeAreaActionBar>
        <Link href="/h5/children/new" className="block">
          <Button block color="primary" shape="rounded" size="large" className="!font-bold">
            <AddOutline /> 新增孩子档案
          </Button>
        </Link>
      </SafeAreaActionBar>
    </>
  );
}
