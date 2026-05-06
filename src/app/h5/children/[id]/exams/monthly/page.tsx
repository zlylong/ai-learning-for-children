import { MonthlyExamClient } from '@/components/h5/MonthlyExamClient';

export default async function MonthlyExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MonthlyExamClient childId={id} />;
}
