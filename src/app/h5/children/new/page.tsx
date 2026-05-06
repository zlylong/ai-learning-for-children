import { Suspense } from 'react';
import { AppShell } from '@/components/h5/AppShell';
import { ChildCreateClient } from '@/components/h5/ChildCreateClient';

export default function NewChildPage() {
  return (
    <AppShell title="新增孩子" activeKey="profile">
      <Suspense fallback={<div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">加载表单...</div>}>
        <ChildCreateClient />
      </Suspense>
    </AppShell>
  );
}
