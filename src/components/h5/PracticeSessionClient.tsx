'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DotLoading, ErrorBlock, Input, Radio, Toast } from 'antd-mobile';
import { FixedActionBar } from './FixedActionBar';
import type { PracticeSessionRecord } from '@/features/practice/schema';

export function PracticeSessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/practice-sessions/${sessionId}`, { cache: 'no-store' });
      const data = (await response.json()) as { session?: PracticeSessionRecord; error?: string };
      if (!response.ok || !data.session) throw new Error(data.error ?? '练习加载失败');
      setSession(data.session);
      setAnswers(Object.fromEntries(data.session.questions.map((question) => [question.id, question.userAnswer ?? ''])));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);

  const question = session?.questions[index];
  const progressText = useMemo(() => session ? `${index + 1} / ${session.questions.length}` : '', [index, session]);

  async function submit() {
    if (!session) return;
    const missing = session.questions.find((item) => !answers[item.id]?.trim());
    if (missing) {
      Toast.show({ icon: 'fail', content: '请完成所有题目后再提交' });
      setIndex(session.questions.findIndex((item) => item.id === missing.id));
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/practice-sessions/${session.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: session.questions.map((item) => ({ questionId: item.id, userAnswer: answers[item.id] })) }),
      });
      const data = (await response.json()) as { session?: PracticeSessionRecord; error?: string };
      if (!response.ok || !data.session) throw new Error(data.error ?? '提交失败');
      Toast.show({ icon: 'success', content: '已提交' });
      router.replace(`/h5/practice-sessions/${session.id}/result`);
    } catch (err) {
      Toast.show({ icon: 'fail', content: err instanceof Error ? err.message : '提交失败' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">加载练习 <DotLoading /></div>;
  if (error || !session || !question) return <ErrorBlock status="empty" title="无法查看练习" description={error ?? '练习不存在'} />;

  return (
    <div className="space-y-4 pb-28">
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{session.knowledgePoint}</span>
          <span>{progressText}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${((index + 1) / session.questions.length) * 100}%` }} />
        </div>
      </section>

      <section className="min-h-[360px] rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold text-blue-600">第 {index + 1} 题</p>
        <h1 className="mt-4 text-xl font-bold leading-relaxed text-slate-950">{question.stem}</h1>
        <div className="mt-8">
          {question.options.length > 0 ? (
            <Radio.Group value={answers[question.id] ?? ''} onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: String(value) }))}>
              <div className="space-y-3">
                {question.options.map((option) => (
                  <label key={option} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-base font-medium text-slate-900">
                    <Radio value={option} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </Radio.Group>
          ) : (
            <Input
              clearable
              placeholder="请输入答案"
              value={answers[question.id] ?? ''}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
              className="rounded-2xl bg-slate-50 px-4 py-3 text-lg"
            />
          )}
        </div>
      </section>

      <FixedActionBar>
        <div className="grid grid-cols-3 gap-2">
          <Button block size="large" fill="outline" disabled={index === 0} className="!rounded-2xl" onClick={() => setIndex((value) => Math.max(0, value - 1))}>上一题</Button>
          <Button block size="large" fill="outline" disabled={index >= session.questions.length - 1} className="!rounded-2xl" onClick={() => setIndex((value) => Math.min(session.questions.length - 1, value + 1))}>下一题</Button>
          <Button block size="large" color="primary" loading={submitting} className="!rounded-2xl" onClick={submit}>提交</Button>
        </div>
      </FixedActionBar>
    </div>
  );
}
