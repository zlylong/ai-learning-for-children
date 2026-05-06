import Link from 'next/link';
import { AppShell } from '@/components/h5/AppShell';
import { prisma } from '@/lib/prisma';

async function getUserProfile() {
  const DEMO_USER_ID = 'demo-user';
  try {
    return await prisma.user.findUnique({
      where: { id: DEMO_USER_ID },
      include: { _count: { select: { children: true } } },
    });
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const user = await getUserProfile();

  return (
    <AppShell title="我的" activeKey="profile">
      <section className="flex flex-col items-center py-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-3xl text-white shadow-sm">👤</div>
        <h2 className="mt-4 text-xl font-bold text-slate-950">{user?.name || '家长用户'}</h2>
        <p className="text-sm text-slate-500">{user?.phone || '未绑定手机号'}</p>
      </section>

      <section className="grid grid-cols-2 gap-4 px-2">
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5">
          <div className="text-2xl font-bold text-indigo-600">{user?._count.children || 0}</div>
          <div className="text-xs text-slate-500">关联孩子</div>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5">
          <div className="text-2xl font-bold text-emerald-600">0</div>
          <div className="text-xs text-slate-500">累计错题</div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        <Link href="/h5/children" className="flex items-center justify-between border-b border-slate-100 px-4 py-4 active:bg-slate-50">
          <span><span className="mr-3">🧒</span>档案管理</span>
          <span className="text-slate-300">›</span>
        </Link>
        <Link href="/h5/profile/advanced-settings" className="flex items-center justify-between border-b border-slate-100 px-4 py-4 active:bg-slate-50">
          <span><span className="mr-3">🤖</span>高级设置 · AI 对接</span>
          <span className="text-slate-300">›</span>
        </Link>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 text-slate-500">
          <span><span className="mr-3">🔔</span>通知设置</span>
          <span className="text-slate-300">›</span>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 text-slate-500">
          <span><span className="mr-3">🛡️</span>隐私协议</span>
          <span className="text-slate-300">›</span>
        </div>
        <div className="flex items-center justify-between px-4 py-4 text-slate-500">
          <span><span className="mr-3">💬</span>反馈建议</span>
          <span className="text-slate-300">›</span>
        </div>
      </section>

      <section className="mt-8 px-4">
        <button className="h-12 w-full rounded-2xl border border-rose-200 text-base font-semibold text-rose-600 active:bg-rose-50">
          退出登录
        </button>
      </section>
    </AppShell>
  );
}
