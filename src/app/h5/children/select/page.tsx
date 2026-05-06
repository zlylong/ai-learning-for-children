import { AppShell } from '@/components/h5/AppShell';
import { ChildListClient } from '@/components/h5/ChildListClient';

export default function SelectChildPage() {
  return (
    <AppShell title="选择孩子" noPadding>
      <div className="px-4 py-6">
         <p className="mb-6 text-sm text-slate-500">请选择当前正在学习的孩子</p>
         <ChildListClient mode="select" />
      </div>
    </AppShell>
  );
}
