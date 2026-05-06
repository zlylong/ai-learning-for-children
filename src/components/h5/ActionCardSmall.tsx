import Link from 'next/link';

export function ActionCardSmall({ title, icon, href, color }: { title: string; icon: React.ReactNode; href: string; color: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04] active:bg-slate-50">
       <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-2`}>
          {icon}
       </div>
       <div className="text-xs font-bold text-slate-900">{title}</div>
    </Link>
  );
}
