import { BottomTabBar, type BottomTabKey } from './BottomTabBar';

export function AppShell({
  children,
  title,
  activeKey = 'home',
}: Readonly<{
  children: React.ReactNode;
  title?: string;
  activeKey?: BottomTabKey;
}>) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#f6f8fb] shadow-sm">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f6f8fb]/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-500">AI Learning</p>
            <h1 className="mt-1 text-lg font-bold text-slate-950">{title ?? 'AI 学习诊断'}</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm">✨</div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4 pb-24">{children}</main>

      <BottomTabBar activeKey={activeKey} />
    </div>
  );
}
