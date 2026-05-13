import { AppShell } from '@/components/h5/AppShell';
import { LearningPlanClient } from '@/components/h5/LearningPlanClient';

export default async function LearningPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell title="学习计划" activeKey="home">
      <LearningPlanClient childId={id} />
    </AppShell>
  );
}
