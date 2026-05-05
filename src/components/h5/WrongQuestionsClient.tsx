'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button, ErrorBlock, PullToRefresh, Skeleton, Tag } from 'antd-mobile';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';
import { FixedActionBar } from './FixedActionBar';

export function WrongQuestionsClient({ childId }: { childId: string }) {
  const [items, setItems] = useState<WrongQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch(`/api/wrong-questions?childId=${encodeURIComponent(childId)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('错题加载失败');
    const data = (await response.json()) as { wrongQuestions: WrongQuestionRecord[] };
    setItems(data.wrongQuestions);
  }, [childId]);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : '加载失败')).finally(() => setLoading(false));
  }, [load]);

  if (loading) return <WrongQuestionSkeleton />;
  if (error) return <ErrorBlock status="busy" title="加载失败" description={error} />;

  return (
    <>
      <PullToRefresh onRefresh={load}>
        <div className="space-y-3 pb-28">
          {items.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
              <div className="text-4xl">📝</div>
              <h2 className="mt-3 text-lg font-bold text-slate-950">暂无错题分析</h2>
              <p className="mt-2 text-sm text-slate-500">先上传试卷结果，系统会用 mock AI 生成错题卡片。</p>
            </div>
          ) : items.map((item, index) => <WrongQuestionCard key={item.id} item={item} index={index + 1} />)}
        </div>
      </PullToRefresh>
      <FixedActionBar>
        <Link href={`/h5/children/${childId}/uploads`}>
          <Button block color="primary" size="large" className="!rounded-2xl">上传新试卷</Button>
        </Link>
      </FixedActionBar>
    </>
  );
}

function WrongQuestionSkeleton() {
  return (
    <div className="space-y-3 pb-28">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={4} animated />
        </div>
      ))}
    </div>
  );
}

function WrongQuestionCard({ item, index }: { item: WrongQuestionRecord; index: number }) {
  return (
    <article className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-500">错题 {index}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{item.subject}</span>
        {item.knowledgePoints.map((point) => (
          <Tag key={point.id} color="primary" fill="outline" round>{point.title}</Tag>
        ))}
      </div>
      <InfoBlock label="题干" value={item.questionText} strong />
      <div className="mt-3 grid grid-cols-1 gap-3">
        <InfoBlock label="学生答案" value={item.userAnswer} tone="danger" />
        <InfoBlock label="正确答案" value={item.correctAnswer} tone="success" />
        <InfoBlock label="错误分析" value={item.analysis} />
      </div>
    </article>
  );
}

function InfoBlock({ label, value, tone, strong }: { label: string; value: string; tone?: 'danger' | 'success'; strong?: boolean }) {
  const toneClass = tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-emerald-600' : 'text-slate-700';
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={`mt-1 text-sm leading-6 ${strong ? 'font-semibold text-slate-950' : toneClass}`}>{value}</p>
    </div>
  );
}
