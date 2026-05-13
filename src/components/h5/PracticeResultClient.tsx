'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, DotLoading, ErrorBlock, Space } from 'antd-mobile';
import { RedoOutline } from 'antd-mobile-icons';
import type { PracticeSessionRecord } from '@/features/practice/schema';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';
import { buildRemediationResult, buildRewrongWarnings, type RemediationResult } from './remediation-insights';
import { ResultSummaryCard } from './ResultSummaryCard';
import { WrongQuestionCard } from './WrongQuestionCard';
import { SafeAreaActionBar } from './SafeAreaActionBar';

export function PracticeResultClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<PracticeSessionRecord | null>(null);
  const [remediationResult, setRemediationResult] = useState<RemediationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/practice-sessions/${sessionId}`, { cache: 'no-store' });
      const data = (await response.json()) as { session?: PracticeSessionRecord; error?: string };
      if (!response.ok || !data.session) throw new Error(data.error ?? '结果加载失败');
      setSession(data.session);
      const wrongResponse = await fetch(`/api/wrong-questions?childId=${encodeURIComponent(data.session.childId)}`, { cache: 'no-store' });
      const wrongData = (await wrongResponse.json()) as { wrongQuestions?: WrongQuestionRecord[] };
      setRemediationResult(buildRemediationResult(data.session, buildRewrongWarnings(wrongData.wrongQuestions ?? [])));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><DotLoading color="primary" /></div>;
  if (error || !session) return <ErrorBlock status="empty" title="无法查看结果" description={error ?? '结果不存在'} />;
  if (!session.result) return <ErrorBlock status="empty" title="还没有提交" description="完成答题后再查看结果" />;

  const wrongQuestions = session.questions.filter((item) => item.isCorrect === false);
  const accuracy = session.result.accuracy;

  const getEncouragement = () => {
    if (accuracy >= 80) return "太棒了！这个知识点基本掌握了";
    if (accuracy >= 60) return "表现不错，还需要再练几题巩固下";
    return "基础还不牢固，建议回顾后再练习";
  };

  return (
    <div className="space-y-8 pb-32">
      {/* 1. Summary */}
      <ResultSummaryCard 
        score={accuracy}
        count={session.result.totalCount}
        correctCount={session.result.correctCount}
        message={getEncouragement()}
      />

      {remediationResult ? (
        <section className={`rounded-3xl p-5 shadow-sm ring-1 ring-black/[0.04] ${remediationResult.solved === true ? 'bg-emerald-50 text-emerald-800' : remediationResult.solved === false ? 'bg-amber-50 text-amber-800' : 'bg-white text-slate-700'}`}>
          <div className="text-sm font-bold">{remediationResult.solved === true ? '✅ ' : remediationResult.solved === false ? '🔁 ' : '🧭 '}{remediationResult.title}</div>
          <p className="mt-2 text-sm leading-6">{remediationResult.message}</p>
        </section>
      ) : null}

      {/* 2. Wrong Analysis */}
      <section>
        <div className="mb-4 px-1">
           <h2 className="text-base font-bold text-slate-900">错题解析</h2>
        </div>
        {wrongQuestions.length === 0 ? (
           <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.04]">
              <div className="text-3xl mb-2">🌟</div>
              <div className="text-sm text-slate-500 font-medium">本次练习全对，真了不起！</div>
           </div>
        ) : (
          <div className="space-y-4">
            {wrongQuestions.map((q) => (
              <WrongQuestionCard 
                key={q.id}
                content={q.stem}
                analysis={q.analysis || ''}
                knowledgePoints={[q.knowledgePoint]}
                reason="需要加强练习"
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Actions */}
      <SafeAreaActionBar>
        <Space block direction="vertical">
          <Button 
            block 
            color="primary" 
            className="!h-12 !rounded-2xl !font-bold"
            onClick={() => {
              const params = new URLSearchParams({ childId: session.childId, knowledgePoint: session.knowledgePoint });
              if (session.subject) params.set('subject', session.subject);
              if (remediationResult?.wasRewrongPoint) params.set('remediation', '1');
              router.push(`/h5/practice?${params.toString()}`);
            }}
          >
            <RedoOutline /> 再练 5 题
          </Button>
          <div className="flex gap-3">
             <Button 
                fill="none" 
                className="flex-1 !h-12 !rounded-2xl !bg-slate-100 !text-slate-600 !font-bold"
                onClick={() => router.push(`/h5`)}
              >
                返回首页
              </Button>
              <Button 
                fill="none" 
                className="flex-1 !h-12 !rounded-2xl !bg-indigo-50 !text-indigo-600 !font-bold"
                onClick={() => router.push(`/h5/children/${session.childId}/wrong-questions`)}
              >
                查看错题库
              </Button>
          </div>
        </Space>
      </SafeAreaActionBar>
    </div>
  );
}
