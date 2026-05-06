import { UserOutline, ArrowsAltOutline } from 'antd-mobile-icons';
import Link from 'next/link';

export function ChildSwitcher({ name, grade }: { name: string; grade: string; id?: string }) {
  return (
    <Link href="/h5/children/select" className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
          <UserOutline fontSize={24} />
        </div>
        <div>
          <div className="text-lg font-bold text-slate-900">{name}</div>
          <div className="text-xs text-slate-500">{grade}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-indigo-500 font-medium">
        切换孩子 <ArrowsAltOutline />
      </div>
    </Link>
  );
}
