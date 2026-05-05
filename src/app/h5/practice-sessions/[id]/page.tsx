import { PracticeSessionClient } from '@/components/h5/PracticeSessionClient';

export default async function PracticeSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PracticeSessionClient sessionId={id} />;
}
