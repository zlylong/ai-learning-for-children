'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button, DotLoading, ErrorBlock } from 'antd-mobile';
import { FixedActionBar } from './FixedActionBar';
import type { MasteryStatus, PracticeSessionRecord } from '@/features/practice/schema';

const masteryText: Record<MasteryStatus, string> = {
  WEAK: '薄弱',
  PRACTICING: '练习中',
  MASTERED: '已掌握',
};

export function PracticeResultClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/practice-sessions/${sessionId}`, { cache: 'no-store' });
      const data = (await response.json()) as { session?: PracticeSessionRecord; error?: string };
      if (!response.ok || !data.session) throw new Error(data.error ?? '结果加载失败');
      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">加载结果 <DotLoading /></div>;
  if (error || !session) return <ErrorBlock status="empty" title="无法查看结果" description={error ?? '结果不存在'} />;
  if (!session.result) return <ErrorBlock status="empty" title="还没有提交" description="完成答题后再查看结果" />;

  const wrongQuestions = session.questions.filter((item) => item.isCorrect === false);

  return (
    <div className="space-y-4 pb-28">
      <section className="rounded-[32px] bg-gradient-to-br from-violet-600 to-indigo-500 p-5 text-white shadow-lg">
        <p className="text-sm opacity-85">练习结果</p>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-5xl font-black">{session.result.accuracy}%</span>
          <span className="pb-2 text-sm opacity-90">正确率</span>
        </div>
        <p className="mt-3 text-sm opacity-90">答对 {session.result.correctCount} / {session.result.totalCount} 题</p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-base font-bold text-slate-900">掌握状态变化</h2>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
          <span className="text-sm text-slate-500">{masteryText[session.result.masteryBefore]}</span>
          <span className="text-xl">→</span>
          <span className="text-base font-bold text-blue-600">{masteryText[session.result.masteryAfter]}</span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-base font-bold text-slate-900">错题解析</h2>
        {wrongQuestions.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 text-center text-slate-500 shadow-sm">本次没有错题，继续保持！</div>
        ) : wrongQuestions.map((question) => (
          <article key={question.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-semibold text-slate-500">{question.knowledgePoint}</p>
            <h3 className="mt-2 text-base font-bold leading-relaxed text-slate-950">{question.stem}</h3>
            <div className="mt-3 grid gap-2 text-sm">
              <p className="rounded-2xl bg-rose-50 p-3 text-rose-700">你的答案：{question.userAnswer}</p>
              <p className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">正确答案：{question.answerText}</p>
              <p className="rounded-2xl bg-slate-50 p-3 text-slate-700">解析：{question.analysis}</p>
            </div>
          </article>
        ))}
      </section>

      <FixedActionBar>
        <Link href={`/h5/children/${session.childId}/practice/new`}>
          <Button block color="primary" size="large" className="!rounded-2xl">再练一次</Button>
        </Link>
      </FixedActionBar>
    </div>
  );
}
