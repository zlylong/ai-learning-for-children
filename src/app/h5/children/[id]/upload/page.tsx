import { AppShell } from '@/components/h5/AppShell';
import { ExamUploadClient } from '@/components/h5/ExamUploadClient';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function UploadPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppShell title="上传试卷" noPadding>
      <ExamUploadClient childId={id} />
    </AppShell>
  );
}
