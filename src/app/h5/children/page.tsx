import { AppShell } from '@/components/h5/AppShell';
import { ChildListClient } from '@/components/h5/ChildListClient';

export default function ChildrenPage() {
  return (
    <AppShell title="孩子档案" activeKey="profile">
      <ChildListClient />
    </AppShell>
  );
}
