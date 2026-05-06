
export function StatCard({ label, value, unit, color = 'indigo' }: { label: string; value: string | number; unit?: string; color?: 'indigo' | 'orange' | 'green' | 'rose' }) {
  const colors = {
    indigo: 'text-indigo-600 bg-indigo-50',
    orange: 'text-orange-600 bg-orange-50',
    green: 'text-green-600 bg-green-50',
    rose: 'text-rose-600 bg-rose-50',
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-xl font-bold ${colors[color].split(' ')[0]}`}>{value}</span>
        {unit && <span className="text-[10px] text-slate-400 font-medium">{unit}</span>}
      </div>
    </div>
  );
}
