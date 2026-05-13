import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/h5/AppShell';
import { LearningPointPackagesClient } from '@/components/h5/LearningPointPackagesClient';
import { authService } from '@/features/auth/auth-service';

export default async function LearningPointPackagesPage() {
  const user = await authService.getCurrentUserFromCookies(await cookies());
  if (!user) redirect('/h5/login?next=/h5/profile/learning-point-packages');
  if (user.role !== 'ADMIN') redirect('/h5/profile');

  return (
    <AppShell title="知识点包管理" activeKey="profile">
      <LearningPointPackagesClient />
    </AppShell>
  );
}
