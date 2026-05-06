import { AppShell } from '@/components/h5/AppShell';
import { HomeClient } from '@/components/h5/HomeClient';

export default function HomePage() {
  return (
    <AppShell title="学习概览" activeKey="home" noHeader>
      <HomeClient />
    </AppShell>
  );
}
