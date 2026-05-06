
import { Button } from 'antd-mobile';

export function EmptyState({ title, desc, actionText, onAction, icon = '🎐' }: { 
  title: string; 
  desc: string; 
  actionText?: string; 
  onAction?: () => void;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-lg font-bold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-500 max-w-[240px]">{desc}</div>
      {actionText && onAction && (
        <Button color="primary" shape="rounded" onClick={onAction} className="mt-6 min-w-[140px]">
          {actionText}
        </Button>
      )}
    </div>
  );
}
