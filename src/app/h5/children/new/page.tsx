import { AppShell } from '@/components/h5/AppShell';
import { ChildCreateClient } from '@/components/h5/ChildCreateClient';

export default function NewChildPage() {
  return (
    <AppShell title="新增孩子" activeKey="children">
      <ChildCreateClient />
    </AppShell>
  );
}
