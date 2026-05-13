import { cookies } from 'next/headers';
import Link from 'next/link';
import { AppShell } from '@/components/h5/AppShell';
import { LogoutButton } from '@/components/h5/LogoutButton';
import { childService } from '@/features/children/service';
import { authService } from '@/features/auth/auth-service';
import {
  RightOutline,
  UserOutline,
  AppOutline,
  BellOutline,
  CheckOutline,
  MessageOutline,
  TeamOutline,
  AddCircleOutline,
} from 'antd-mobile-icons';

async function getChildCount() {
  try {
    return (await childService.list()).length;
  } catch {
    return 0;
  }
}

export default async function ProfilePage() {
  const user = await authService.getCurrentUserFromCookies(await cookies());
  const childCount = await getChildCount();

  return (
    <AppShell title="我的" activeKey="profile" noHeader>
      <div className="pt-8 pb-10">
        <section className="flex flex-col items-center mb-8">
          <div className="relative">
             <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-indigo-50 text-4xl text-indigo-500">
               <UserOutline />
             </div>
             <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md border-2 border-white text-xs">
                {user?.role === 'ADMIN' ? '管' : '用'}
             </div>
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900">{user?.name || '未登录用户'}</h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide mt-1">
             {user ? `${user.username} · ${user.role === 'ADMIN' ? '管理员' : '普通用户'}` : '请登录'}
          </p>
        </section>

        <section className="space-y-4">
          <div className="rounded-[32px] bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
            <MenuLink
              href="/h5/children"
              icon={<TeamOutline />}
              label="档案管理"
              count={childCount}
            />
            {user?.role === 'ADMIN' ? (
              <>
                <MenuLink
                  href="/h5/profile/advanced-settings"
                  icon={<AppOutline />}
                  label="AI 模型设置"
                />
                <MenuLink
                  href="/h5/profile/learning-point-packages"
                  icon={<CheckOutline />}
                  label="知识点包管理"
                />
                <MenuLink
                  href="/h5/profile/users"
                  icon={<AddCircleOutline />}
                  label="用户管理"
                />
              </>
            ) : null}
          </div>

          <div className="rounded-[32px] bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
             <MenuLink href="/h5/profile" icon={<BellOutline />} label="通知中心" disabled />
             <MenuLink href="/h5/profile" icon={<CheckOutline />} label="隐私与安全" disabled />
             <MenuLink href="/h5/profile" icon={<MessageOutline />} label="意见反馈" disabled />
          </div>
        </section>

        <section className="mt-10 px-6">
          <LogoutButton />
          <div className="mt-6 text-center">
             <p className="text-[10px] text-slate-300 font-medium uppercase tracking-[0.2em]">
                AI Learning Diagnosis v0.1.0
             </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MenuLink({ href, icon, label, count, disabled }: { href: string; icon: React.ReactNode; label: string; count?: number; disabled?: boolean }) {
  return (
    <Link
      href={disabled ? '#' : href}
      className={`flex items-center justify-between px-6 py-5 active:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0 ${disabled ? 'opacity-50 cursor-default' : ''}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-xl text-slate-400">{icon}</span>
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-600">
            {count}
          </span>
        )}
        <RightOutline className="text-slate-300 text-xs" />
      </div>
    </Link>
  );
}
