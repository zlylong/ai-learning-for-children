import { PracticeNewClient } from '@/components/h5/PracticeNewClient';

export default async function NewPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PracticeNewClient childId={id} />;
}
