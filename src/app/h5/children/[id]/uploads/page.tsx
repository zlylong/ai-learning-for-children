import { AppShell } from '@/components/h5/AppShell';
import { ExamUploadClient } from '@/components/h5/ExamUploadClient';

type PageProps = { params: Promise<{ id: string }> };

export default async function ExamUploadsPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <AppShell title="试卷上传" activeKey="children">
      <ExamUploadClient childId={id} />
    </AppShell>
  );
}
