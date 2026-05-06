import { AppShell } from '@/components/h5/AppShell';
import { ChildDetailClient } from '@/components/h5/ChildDetailClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChildDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppShell title="档案详情" activeKey="profile">
      <ChildDetailClient id={id} />
    </AppShell>
  );
}
