import { redirect } from 'next/navigation';

export default async function NewPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = new URLSearchParams({ childId: id });
  const incoming = await searchParams;
  Object.entries(incoming).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value) {
      query.set(key, value);
    }
  });
  redirect(`/h5/practice?${query.toString()}`);
}
