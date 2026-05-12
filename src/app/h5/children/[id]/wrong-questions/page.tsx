import { redirect } from 'next/navigation';

type PageProps = { params: Promise<{ id: string }> };

export default async function WrongQuestionsPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/h5/wrong-questions?childId=${encodeURIComponent(id)}`);
}
