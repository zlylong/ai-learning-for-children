import Link from 'next/link';
import { AppShell } from '@/components/h5/AppShell';
import { prisma } from '@/lib/prisma';
import { 
  RightOutline, 
  UserOutline, 
  AppOutline, 
  BellOutline, 
  CheckOutline, 
  MessageOutline,
  TeamOutline
} from 'antd-mobile-icons';

async function getUserProfile() {
  const DEMO_USER_ID = 'demo-user';
  try {
    return await prisma.user.findUnique({
      where: { id: DEMO_USER_ID },
      include: { 
        _count: { 
          select: { 
            children: true,
          } 
        } 
      },
    });
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const user = await getUserProfile();

  return (
    <AppShell title="我的" activeKey="profile" noHeader>
      <div className="pt-8 pb-10">
        {/* 1. Header Card */}
        <section className="flex flex-col items-center mb-8">
          <div className="relative">
             <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-indigo-50 text-4xl text-indigo-500">
               <UserOutline />
             </div>
             <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md border-2 border-white text-xs">
                ✨
             </div>
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900">{user?.name || '家长用户'}</h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide mt-1">
             {user?.phone || '未绑定手机号'}
          </p>
        </section>

        {/* 2. Menu */}
        <section className="space-y-4">
          <div className="rounded-[32px] bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
            <MenuLink 
              href="/h5/children" 
              icon={<TeamOutline />} 
              label="档案管理" 
              count={user?._count.children} 
            />
            <MenuLink 
              href="/h5/profile/advanced-settings" 
              icon={<AppOutline />} 
              label="AI 模型设置" 
            />
          </div>

          <div className="rounded-[32px] bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
             <MenuLink 
                href="/h5/profile" 
                icon={<BellOutline />} 
                label="通知中心" 
                disabled
              />
              <MenuLink 
                href="/h5/profile" 
                icon={<CheckOutline />} 
                label="隐私与安全" 
                disabled
              />
              <MenuLink 
                href="/h5/profile" 
                icon={<MessageOutline />} 
                label="意见反馈" 
                disabled
              />
          </div>
        </section>

        <section className="mt-10 px-6">
          <button className="h-14 w-full rounded-2xl bg-white border border-rose-100 text-base font-bold text-rose-500 shadow-sm active:bg-rose-50 transition-colors">
            退出登录
          </button>
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
