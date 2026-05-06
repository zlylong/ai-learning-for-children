
export function ResultSummaryCard({ score, count, correctCount, message }: { 
  score: number; 
  count: number; 
  correctCount: number;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-[32px] bg-white p-8 text-center shadow-lg ring-1 ring-black/[0.04]">
      <div className="relative mb-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
           <div className="flex flex-col items-center">
              <span className="text-4xl font-black">{score}</span>
              <span className="text-xs font-bold opacity-60">正确率</span>
           </div>
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-md">
          {score >= 80 ? '🎉' : score >= 60 ? '👍' : '💪'}
        </div>
      </div>
      
      <div className="text-xl font-bold text-slate-900">{message}</div>
      
      <div className="mt-6 flex w-full gap-4">
        <div className="flex-1 rounded-2xl bg-slate-50 py-3">
           <div className="text-lg font-bold text-slate-900">{count}</div>
           <div className="text-[10px] font-medium text-slate-400">总题数</div>
        </div>
        <div className="flex-1 rounded-2xl bg-slate-50 py-3">
           <div className="text-lg font-bold text-green-600">{correctCount}</div>
           <div className="text-[10px] font-medium text-slate-400">答对</div>
        </div>
        <div className="flex-1 rounded-2xl bg-slate-50 py-3">
           <div className="text-lg font-bold text-rose-500">{count - correctCount}</div>
           <div className="text-[10px] font-medium text-slate-400">答错</div>
        </div>
      </div>
    </div>
  );
}
