import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/h5/AppShell';
import { UserManagementClient } from '@/components/h5/UserManagementClient';
import { authService } from '@/features/auth/auth-service';

export default async function UsersPage() {
  const user = await authService.getCurrentUserFromCookies(await cookies());
  if (!user) redirect('/h5/login?next=/h5/profile/users');
  if (user.role !== 'ADMIN') redirect('/h5/profile');

  return (
    <AppShell title="用户管理" activeKey="profile">
      <UserManagementClient />
    </AppShell>
  );
}
