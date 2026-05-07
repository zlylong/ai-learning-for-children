import { AppShell } from '@/components/h5/AppShell';
import { PracticeNewClient } from '@/components/h5/PracticeNewClient';

export default async function NewPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell title="知识点练习" activeKey="practice">
      <PracticeNewClient childId={id} />
    </AppShell>
  );
}
