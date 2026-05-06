
import { ProgressBar } from 'antd-mobile';

export function PracticeProgress({ current, total }: { current: number; total: number }) {
  const percent = Math.round((current / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs font-bold text-slate-500 tabular-nums">
        {current}/{total}
      </div>
      <div className="flex-1">
        <ProgressBar percent={percent} style={{ '--track-width': '6px', '--fill-color': 'var(--adm-color-primary)' }} />
      </div>
    </div>
  );
}
