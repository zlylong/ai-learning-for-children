import Link from 'next/link';
import { AppShell } from '@/components/h5/AppShell';
import { prisma } from '@/lib/prisma';

async function getPracticeOverview() {
  const DEMO_USER_ID = 'demo-user';
  try {
    const [sessions, children] = await Promise.all([
      prisma.practiceSession.findMany({
        where: { child: { userId: DEMO_USER_ID } },
        include: { child: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.child.findMany({
        where: { userId: DEMO_USER_ID },
        include: { _count: { select: { practiceSessions: true } } },
      }),
    ]);
    return { sessions, children };
  } catch {
    return { sessions: [], children: [] };
  }
}

export default async function PracticePage() {
  const { sessions, children } = await getPracticeOverview();

  return (
    <AppShell title="练习中心" activeKey="practice">
      <section className="space-y-3">
        <h2 className="px-1 text-base font-bold text-slate-900">选择孩子开始练习</h2>
        {children.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
            <p className="mb-4 text-slate-500">还没有孩子档案</p>
            <Link href="/h5/children/new" className="inline-flex h-10 items-center rounded-xl border border-indigo-200 px-4 text-sm font-semibold text-indigo-600">
              立即创建
            </Link>
          </div>
        ) : (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {children.map((child) => (
              <Link key={child.id} href={`/h5/children/${child.id}/practice/new`} className="flex-shrink-0">
                <div className="flex h-32 w-24 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-2 text-center shadow-sm active:bg-slate-50">
                  <div className="mb-2 text-2xl">🧒</div>
                  <div className="w-full truncate text-sm font-bold text-slate-900">{child.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{child._count.practiceSessions}次练习</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900">最近练习记录</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-black/5">
            <div className="mb-2 text-4xl">✍️</div>
            暂无练习记录
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isMonthly = session.type === 'MONTHLY_WRONG_SET';
              return (
                <Link key={session.id} href={`/h5/practice-sessions/${session.id}${session.status === 'COMPLETED' ? '/result' : ''}`} className="block">
                  <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 active:bg-slate-50">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isMonthly ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                        {isMonthly ? '月度复习' : '知识点练习'}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{session.title}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">孩子：{session.child.name}</span>
                      <span className={`text-sm font-bold ${session.status === 'COMPLETED' ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {session.status === 'COMPLETED' ? `${session.accuracy}%` : '进行中'}
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
