import { BottomTabBar, type BottomTabKey } from './BottomTabBar';
import { clsx } from 'clsx';

export function AppShell({
  children,
  title,
  activeKey,
  headerExtras,
  noPadding = false,
  noHeader = false,
}: Readonly<{
  children: React.ReactNode;
  title?: string;
  activeKey?: BottomTabKey;
  headerExtras?: React.ReactNode;
  noPadding?: boolean;
  noHeader?: boolean;
}>) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-[#f8fafc] shadow-sm">
      {!noHeader && (
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              {title && <h1 className="text-lg font-bold text-slate-900">{title}</h1>}
            </div>
            {headerExtras}
          </div>
        </header>
      )}

      <main className={clsx(
        "flex-1 overflow-y-auto overscroll-contain",
        !noPadding && "px-4 py-4",
        activeKey && "pb-6"
      )}>
        {children}
      </main>

      {activeKey && <BottomTabBar activeKey={activeKey} />}
    </div>
  );
}
