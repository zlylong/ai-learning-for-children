'use client';

import { useCallback, useEffect, useState } from 'react';
import { ErrorBlock, PullToRefresh, Skeleton, Tag, Selector, Space } from 'antd-mobile';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';
import { WrongQuestionCard } from './WrongQuestionCard';
import { EmptyState } from './EmptyState';
import { useRouter } from 'next/navigation';

export function WrongQuestionsClient({ childId }: { childId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<WrongQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterSubject, setFilterSubject] = useState<string>('all');

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

  const filteredItems = items.filter(item => filterSubject === 'all' || item.subject === filterSubject);

  // Extract top weak points
  const kpCounts: Record<string, number> = {};
  items.forEach(item => {
    item.knowledgePoints.forEach(kp => {
      kpCounts[kp.title] = (kpCounts[kp.title] || 0) + 1;
    });
  });
  const topWeakPoints = Object.entries(kpCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);

  const startPractice = async (kpTitle: string) => {
    // Navigate to practice session creation or similar
    router.push(`/h5/practice?kp=${encodeURIComponent(kpTitle)}`);
  };

  if (loading) return <WrongQuestionSkeleton />;
  if (error) return <ErrorBlock status="busy" title="加载失败" description={error} />;

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Filter */}
      <section className="sticky top-0 z-10 bg-[#f8fafc]/80 backdrop-blur-md py-2 -mx-4 px-4 overflow-x-auto no-scrollbar">
        <Space>
          <Selector
            options={[
              { label: '全部', value: 'all' },
              { label: '数学', value: '数学' },
              { label: '语文', value: '语文' },
              { label: '英语', value: '英语' },
            ]}
            value={[filterSubject]}
            onChange={v => setFilterSubject(v[0] as string)}
            style={{
               '--border-radius': '100px',
               '--checked-border': 'none',
               '--checked-color': 'var(--adm-color-primary)',
               '--checked-text-color': 'white',
               '--padding': '4px 12px',
            }}
          />
        </Space>
      </section>

      {/* 2. Weak Points Summary */}
      {topWeakPoints.length > 0 && (
        <section>
          <div className="mb-3 px-1">
             <h2 className="text-sm font-bold text-slate-900">高频薄弱点</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {topWeakPoints.map(kp => (
              <div 
                key={kp} 
                onClick={() => startPractice(kp)}
                className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-inset ring-rose-500/10 active:opacity-80"
              >
                {kp}
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-200 text-[10px] text-rose-700">
                  {kpCounts[kp]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. List */}
      <section>
        <div className="mb-3 px-1">
           <h2 className="text-sm font-bold text-slate-900">错题记录</h2>
        </div>
        <PullToRefresh onRefresh={load}>
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <EmptyState 
                title="还没有错题" 
                desc="上传试卷结果，AI 会自动为您分析薄弱环节。" 
                actionText="去上传"
                onAction={() => router.push(`/h5/children/${childId}/upload`)}
                icon="📝"
              />
            ) : (
              filteredItems.map((item) => (
                <WrongQuestionCard 
                  key={item.id} 
                  content={item.questionText}
                  analysis={item.analysis}
                  reason={item.analysis.split('\\n')[0].slice(0, 20)} // Mock reason from analysis
                  knowledgePoints={item.knowledgePoints.map(kp => kp.title)}
                  onPractice={() => startPractice(item.knowledgePoints[0]?.title)}
                />
              ))
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
      <Skeleton animated className="h-10 w-full rounded-full" />
      <Skeleton.Title animated />
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <Skeleton.Paragraph lineCount={3} animated />
        </div>
      ))}
    </div>
  );
}
