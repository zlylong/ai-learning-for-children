import { AppShell } from '@/components/h5/AppShell';
import { WeaknessTrainingClient } from '@/components/h5/WeaknessTrainingClient';

export default async function WeaknessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell title="薄弱点专项训练" activeKey="practice">
      <WeaknessTrainingClient childId={id} />
    </AppShell>
  );
}
