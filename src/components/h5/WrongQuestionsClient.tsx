'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ErrorBlock, Input, PullToRefresh, Selector, Skeleton, Space, Tag } from 'antd-mobile';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';
import { WrongQuestionCard } from './WrongQuestionCard';
import { EmptyState } from './EmptyState';
import { useRouter } from 'next/navigation';
import { buildWrongQuestionViewModel, filterWrongQuestions } from './wrong-questions-view-model';

export function WrongQuestionsClient({ childId }: { childId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<WrongQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('all');
  const [knowledgePointId, setKnowledgePointId] = useState('all');
  const [keyword, setKeyword] = useState('');

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch(`/api/wrong-questions?childId=${encodeURIComponent(childId)}`, { cache: 'no-store' });
    const data = (await response.json()) as { wrongQuestions?: WrongQuestionRecord[]; error?: string };
    if (!response.ok) throw new Error(data.error || '错题加载失败');
    setItems(data.wrongQuestions ?? []);
  }, [childId]);

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : '加载失败')).finally(() => setLoading(false));
  }, [load]);

  const viewModel = useMemo(() => buildWrongQuestionViewModel(items), [items]);
  const filteredItems = useMemo(() => filterWrongQuestions(items, { subject, knowledgePointId, keyword }), [items, subject, knowledgePointId, keyword]);

  const startPractice = (kpId?: string, kpTitle?: string) => {
    const query = new URLSearchParams();
    if (kpId) query.set('knowledgePointId', kpId);
    if (kpTitle) query.set('knowledgePoint', kpTitle);
    router.push(`/h5/children/${childId}/practice/new${query.toString() ? `?${query.toString()}` : ''}`);
  };

  if (loading) return <WrongQuestionSkeleton />;
  if (error) return <ErrorBlock status="busy" title="加载失败" description={error} />;

  return (
    <div className="space-y-5 pb-28">
      <section className="rounded-[28px] bg-gradient-to-br from-sky-500 to-indigo-500 p-5 text-white shadow-lg">
        <p className="text-sm opacity-85">错题本</p>
        <h1 className="mt-2 text-2xl font-bold">把错题变成练习计划</h1>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <div className="text-xl font-bold">{viewModel.totalCount}</div>
            <div className="mt-1 text-[11px] opacity-80">错题</div>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <div className="text-xl font-bold">{viewModel.subjectOptions.length - 1}</div>
            <div className="mt-1 text-[11px] opacity-80">科目</div>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <div className="text-xl font-bold">{viewModel.topKnowledgePoints.length}</div>
            <div className="mt-1 text-[11px] opacity-80">薄弱点</div>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-10 -mx-4 space-y-3 bg-[#f8fafc]/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 shadow-sm ring-1 ring-black/5">
          <span className="text-slate-400">🔍</span>
          <Input value={keyword} onChange={setKeyword} clearable placeholder="搜索题干、答案、解析或知识点" />
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <Space direction="vertical" block>
            <Selector options={viewModel.subjectOptions} value={[subject]} onChange={(v) => setSubject(String(v[0] ?? 'all'))} />
            {viewModel.knowledgePointOptions.length > 1 && (
              <Selector options={viewModel.knowledgePointOptions} value={[knowledgePointId]} onChange={(v) => setKnowledgePointId(String(v[0] ?? 'all'))} />
            )}
          </Space>
        </div>
      </section>

      {viewModel.topKnowledgePoints.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">高频薄弱点</h2>
            <Button size="mini" fill="none" color="primary" onClick={() => router.push(`/h5/children/${childId}/exams/weakness`)}>专项训练</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewModel.topKnowledgePoints.map((kp) => (
              <button key={kp.id} type="button" onClick={() => { setKnowledgePointId(kp.id); setKeyword(''); }} className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-inset ring-rose-500/10 active:opacity-80">
                {kp.title}<span className="rounded-full bg-rose-200 px-1.5 text-[10px] text-rose-700">{kp.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900">错题记录</h2>
          <Tag color="default">{filteredItems.length}/{items.length}</Tag>
        </div>
        <PullToRefresh onRefresh={load}>
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <EmptyState
                title={items.length === 0 ? '还没有错题' : '没有匹配的错题'}
                desc={items.length === 0 ? '上传试卷结果，AI 会自动为您分析薄弱环节。' : '换个科目、知识点或关键词再试试。'}
                actionText={items.length === 0 ? '去上传' : '清空筛选'}
                onAction={() => items.length === 0 ? router.push(`/h5/children/${childId}/upload`) : (setSubject('all'), setKnowledgePointId('all'), setKeyword(''))}
                icon="📝"
              />
            ) : (
              filteredItems.map((item) => <WrongQuestionCard key={item.id} item={item} onPractice={startPractice} />)
            )}
          </div>
        </PullToRefresh>
      </section>
    </div>
  );
}

function WrongQuestionSkeleton() {
  return (
    <div className="space-y-4 py-4">
      <Skeleton animated className="h-28 w-full rounded-[28px]" />
      <Skeleton animated className="h-10 w-full rounded-2xl" />
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <Skeleton.Paragraph lineCount={3} animated />
        </div>
      ))}
    </div>
  );
}
