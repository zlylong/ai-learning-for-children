
import Link from 'next/link';
import { RightOutline } from 'antd-mobile-icons';

export function ActionCard({ title, desc, icon, href, color = 'indigo' }: { title: string; desc: string; icon: React.ReactNode; href: string; color?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04] active:bg-slate-50 transition-colors">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-2xl`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold text-slate-900 leading-tight">{title}</div>
        <div className="mt-1 text-xs text-slate-500 truncate">{desc}</div>
      </div>
      <RightOutline className="text-slate-300 group-active:text-slate-400" />
    </Link>
  );
}
