import { AppShell } from '@/components/h5/AppShell';
import { ChildEditClient } from '@/components/h5/ChildEditClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditChildPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppShell title="编辑孩子" activeKey="children">
      <ChildEditClient id={id} />
    </AppShell>
  );
}
