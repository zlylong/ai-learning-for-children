'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DotLoading, ErrorBlock, Toast, Dialog } from 'antd-mobile';
import { LeftOutline, RightOutline, CheckOutline } from 'antd-mobile-icons';
import type { PracticeSessionRecord } from '@/features/practice/schema';
import { QuestionCard } from './QuestionCard';
import { PracticeProgress } from './PracticeProgress';
import { SafeAreaActionBar } from './SafeAreaActionBar';

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
  const total = session?.questions.length ?? 0;

  async function submit() {
    if (!session) return;
    const missingCount = session.questions.filter((item) => !answers[item.id]?.trim()).length;
    
    if (missingCount > 0) {
      const confirmed = await Dialog.confirm({
        content: `还有 ${missingCount} 道题未完成，确认提交吗？`,
        confirmText: '去完成',
        cancelText: '直接提交',
      });
      if (confirmed) return;
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
      Toast.show({ icon: 'success', content: '提交成功' });
      router.replace(`/h5/practice-sessions/${session.id}/result`);
    } catch (err) {
      Toast.show({ icon: 'fail', content: err instanceof Error ? err.message : '提交失败' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><DotLoading color="primary" /></div>;
  if (error || !session || !question) return <ErrorBlock status="empty" title="无法查看练习" description={error ?? '练习不存在'} />;

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] pb-32">
      {/* 1. Progress Header */}
      <section className="mb-6">
        <PracticeProgress current={index + 1} total={total} />
        <div className="mt-2 text-[10px] text-slate-400 font-medium">
          {session.knowledgePoint} · {session.difficulty === 'hard' ? '困难' : session.difficulty === 'easy' ? '简单' : '中等'}
        </div>
      </section>

      {/* 2. Question Card */}
      <section className="flex-1">
        <QuestionCard 
          content={question.stem}
          type={question.questionType === 'single_choice' ? 'choice' : question.questionType === 'fill_blank' ? 'fill' : 'essay'}
          options={question.options.map(opt => ({ label: opt, value: opt }))}
          value={answers[question.id]}
          onChange={(val: string) => setAnswers(prev => ({ ...prev, [question.id]: val }))}
        />
      </section>

      {/* 3. Navigation Bar */}
      <SafeAreaActionBar>
        <div className="flex gap-3">
          <Button 
            fill="none" 
            className="flex-1 !h-12 !rounded-2xl !bg-slate-100 !text-slate-600 !font-bold"
            disabled={index === 0}
            onClick={() => setIndex(i => i - 1)}
          >
            <LeftOutline /> 上一题
          </Button>
          
          {index < total - 1 ? (
             <Button 
                color="primary" 
                className="flex-[2] !h-12 !rounded-2xl !font-bold"
                onClick={() => setIndex(i => i + 1)}
              >
                下一题 <RightOutline />
              </Button>
          ) : (
            <Button 
              color="primary" 
              className="flex-[2] !h-12 !rounded-2xl !font-bold"
              loading={submitting}
              onClick={submit}
            >
              <CheckOutline /> 提交练习
            </Button>
          )}
        </div>
      </SafeAreaActionBar>
    </div>
  );
}
