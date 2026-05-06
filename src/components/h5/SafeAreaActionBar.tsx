
import { clsx } from 'clsx';

export function SafeAreaActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(
      "safe-bottom fixed inset-x-0 bottom-0 z-40 bg-white/80 p-4 backdrop-blur-xl border-t border-slate-100",
      className
    )}>
      <div className="mx-auto max-w-[448px]">
        {children}
      </div>
    </div>
  );
}
