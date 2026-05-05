import { PracticeResultClient } from '@/components/h5/PracticeResultClient';

export default async function PracticeResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PracticeResultClient sessionId={id} />;
}
