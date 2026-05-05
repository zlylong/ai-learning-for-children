'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DotLoading, ErrorBlock, Toast } from 'antd-mobile';
import { ChildForm } from './ChildForm';
import type { ChildFormValues, ChildProfile } from '@/features/children/schema';

export function ChildEditClient({ id }: { id: string }) {
  const router = useRouter();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function updateChild(values: ChildFormValues) {
    const response = await fetch(`/api/children/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) throw new Error('保存失败，请检查表单');
    Toast.show({ icon: 'success', content: '孩子档案已更新' });
    router.replace(`/h5/children/${id}`);
    router.refresh();
  }

  if (loading) return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">加载档案 <DotLoading /></div>;
  if (error || !child) return <ErrorBlock status="empty" title="无法编辑档案" description={error ?? '孩子档案不存在'} />;

  return <ChildForm initialValues={child} submitText="保存修改" onSubmit={updateChild} />;
}
