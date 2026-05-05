import { AppShell } from '@/components/h5/AppShell';
import { WrongQuestionsClient } from '@/components/h5/WrongQuestionsClient';

type PageProps = { params: Promise<{ id: string }> };

export default async function WrongQuestionsPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppShell title="错题分析" activeKey="children">
      <WrongQuestionsClient childId={id} />
    </AppShell>
  );
}
