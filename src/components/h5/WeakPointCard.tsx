
import { Button } from 'antd-mobile';

export function WeakPointCard({ name, reason, onPractice }: { name: string; reason: string; onPractice: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex-1 mr-4">
        <div className="font-bold text-slate-900">{name}</div>
        <div className="mt-1 text-xs text-rose-500 font-medium">{reason}</div>
      </div>
      <Button 
        color="primary" 
        size="small" 
        shape="rounded" 
        onClick={onPractice}
        className="!text-xs !h-8 !px-4"
      >
        练 5 题
      </Button>
    </div>
  );
}
