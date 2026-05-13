'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DotLoading, ProgressBar, Toast } from 'antd-mobile';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';
import { buildLearningPlan, type LearningPlanViewModel } from './learning-plan';

export function LearningPlanClient({ childId }: { childId: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<LearningPlanViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionRes, wrongRes] = await Promise.all([
        fetch(`/api/practice-sessions?childId=${encodeURIComponent(childId)}`, { cache: 'no-store' }),
        fetch(`/api/wrong-questions?childId=${encodeURIComponent(childId)}`, { cache: 'no-store' }),
      ]);
      const sessionData = await sessionRes.json();
      const wrongData = await wrongRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.error || '学习计划加载失败');
      setPlan(buildLearningPlan({
        childId,
        sessions: sessionData.sessions || [],
        wrongQuestions: (wrongData.wrongQuestions || []) as WrongQuestionRecord[],
      }));
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '学习计划加载失败' });
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  if (loading) return <div className="flex justify-center py-12"><DotLoading /></div>;
  if (!plan) return <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500">暂无学习计划数据</div>;

  return (
    <div className="space-y-5 pb-10">
      <section className="rounded-[30px] bg-gradient-to-br from-violet-600 to-sky-500 p-5 text-white shadow-lg shadow-violet-100">
        <p className="text-xs font-semibold opacity-80">自动生成计划</p>
        <h1 className="mt-2 text-2xl font-black">每周 2 次专项 + 每月 1 次月度卷</h1>
        <p className="mt-3 text-sm leading-6 opacity-90">系统根据练习与错题记录生成站内提醒，帮助家长陪练时快速掌握节奏。</p>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">计划完成率</div>
            <div className="mt-1 text-xs text-slate-400">本周期 {plan.doneCount}/{plan.targetCount} 项</div>
          </div>
          <div className="text-3xl font-black text-violet-600">{plan.completionRate}%</div>
        </div>
        <ProgressBar percent={plan.completionRate} />
        <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-700">
          提升率：{plan.improvementRate > 0 ? `较上月/历史提升 ${plan.improvementRate} 个百分点` : '暂无明显提升，建议完成本周专项后再观察'}
        </div>
      </section>

      {plan.reminders.length > 0 ? (
        <section className="rounded-[28px] bg-amber-50 p-4 shadow-sm ring-1 ring-amber-100">
          <div className="mb-2 text-sm font-bold text-amber-900">站内提醒</div>
          <div className="space-y-2">
            {plan.reminders.map((reminder) => <div key={reminder} className="rounded-2xl bg-white/70 p-3 text-xs text-amber-800">🔔 {reminder}</div>)}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        {plan.items.map((item) => (
          <article key={item.id} className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-bold text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs text-slate-400">{item.cadence} · {item.nextDueText}</div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.status === 'done' ? 'bg-green-50 text-green-600' : item.status === 'due' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                {item.status === 'done' ? '已完成' : item.status === 'due' ? '待完成' : '待安排'}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
              <ProgressBar percent={Math.round((item.completed / item.target) * 100)} />
              <span className="text-xs font-bold text-slate-500">{item.completed}/{item.target}</span>
            </div>
            <Button block color="primary" fill={item.status === 'done' ? 'outline' : 'solid'} className="mt-4 !rounded-2xl" onClick={() => router.push(item.href)}>
              {item.status === 'done' ? '查看/再练一次' : '去完成'}
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}
