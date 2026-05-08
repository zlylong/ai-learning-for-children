'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DotLoading, Selector, Toast } from 'antd-mobile';
import {
  CalendarOutline,
  PieOutline,
  RightOutline,
  AppOutline,
} from 'antd-mobile-icons';
import { WeakPointCard } from './WeakPointCard';
import { ActionCardSmall } from './ActionCardSmall';
import { EmptyState } from './EmptyState';
import { getPracticeCenterActions } from './practice-entry-actions';

const subjectOptions = [
  { label: '语文', value: 'chinese' },
  { label: '数学', value: 'math' },
  { label: '英语', value: 'english' },
];
type PracticeSubject = 'chinese' | 'math' | 'english';

type KnowledgePointSummary = {
  id: string;
  knowledgePointId: string;
  knowledgePointText: string;
  status: 'WEAK' | 'PRACTICING' | 'MASTERED' | string;
};

export function PracticeEntryClient() {
  const router = useRouter();
  const [childId, setChildId] = useState<string | null>(null);
  const [subject, setSubject] = useState<PracticeSubject>('math');
  const [points, setPoints] = useState<KnowledgePointSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (id: string, nextSubject: PracticeSubject) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/children/${id}/knowledge-points?subject=${encodeURIComponent(nextSubject)}`, { cache: 'no-store' });
      const data = (await res.json()) as { points?: KnowledgePointSummary[] };
      setPoints(data.points || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('selectedChildId');
    if (savedId) {
      setChildId(savedId);
      loadData(savedId, subject);
    } else {
      setLoading(false);
    }
  }, [loadData, subject]);

  const startPractice = async (point: KnowledgePointSummary) => {
    if (!childId) return;
    Toast.show({ icon: 'loading', content: '正在生成练习...', duration: 0 });
    try {
      const res = await fetch('/api/practice-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          subject,
          knowledgePoint: point.knowledgePointText,
          knowledgePointId: point.knowledgePointId,
          questionCount: 5,
          difficulty: 'medium',
          questionType: 'single_choice'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      Toast.clear();
      router.push(`/h5/practice-sessions/${data.sessionId}`);
    } catch (err) {
      Toast.show({ icon: 'fail', content: err instanceof Error ? err.message : '生成失败' });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><DotLoading /></div>;

  if (!childId) {
    return (
      <EmptyState 
        title="练习中心" 
        desc="请先选择孩子后再开始练习" 
        actionText="选择孩子" 
        onAction={() => router.push('/h5/children/select')}
      />
    );
  }

  const weakPoints = points.filter(p => p.status === 'WEAK' || p.status === 'PRACTICING').slice(0, 3);

  const changeSubject = (value: PracticeSubject) => {
    setSubject(value);
    if (childId) void loadData(childId, value);
  };

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="mb-3 text-sm font-bold text-slate-900">选择学科</div>
        <Selector
          columns={3}
          options={subjectOptions}
          value={[subject]}
          onChange={(items) => changeSubject((items[0] as PracticeSubject) ?? 'math')}
        />
      </section>

      <section>
        <div className="mb-3 px-1">
           <h2 className="text-sm font-bold text-slate-900">推荐练习</h2>
           <p className="text-[10px] text-slate-400 mt-0.5">根据近期学习情况自动生成</p>
        </div>
        <div className="space-y-3">
          {weakPoints.length > 0 ? (
            weakPoints.map(p => (
              <WeakPointCard 
                key={p.id} 
                name={p.knowledgePointText} 
                reason={p.status === 'WEAK' ? '最近错题较多' : '练习中，需巩固'} 
                onPractice={() => startPractice(p)}
              />
            ))
          ) : (
             <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/[0.04]">
                <div className="text-3xl mb-2">🎈</div>
                <div className="text-sm text-slate-500">目前状态不错，可以尝试上传新试卷</div>
             </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {getPracticeCenterActions(childId).map((action) => (
          <ActionCardSmall
            key={action.href}
            title={action.title}
            icon={action.title === '知识点练习' ? <AppOutline /> : action.title === '月度错题卷' ? <CalendarOutline /> : <PieOutline />}
            href={action.title === '知识点练习' ? `${action.href}?subject=${subject}` : action.href}
            color={action.color}
          />
        ))}
      </section>

      <section>
        <div className="mb-3 px-1 flex items-center justify-between">
           <h2 className="text-sm font-bold text-slate-900">所有知识点</h2>
           <span className="text-[10px] text-slate-400">当前学科 · 弱项优先</span>
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] divide-y divide-slate-50 overflow-hidden">
          {points.length > 0 ? points.map(p => (
             <div key={p.id} className="flex items-center justify-between p-4 active:bg-slate-50" onClick={() => startPractice(p)}>
                <div className="text-sm font-medium text-slate-700">{p.knowledgePointText}</div>
                <div className="flex items-center gap-2">
                   <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                     p.status === 'MASTERED' ? 'bg-green-50 text-green-600' : 
                     p.status === 'WEAK' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'
                   }`}>
                      {p.status === 'MASTERED' ? '已掌握' : p.status === 'WEAK' ? '薄弱' : '练习中'}
                   </span>
                   <RightOutline className="text-slate-300 text-xs" />
                </div>
             </div>
          )) : (
             <div className="p-8 text-center text-xs text-slate-400">暂无知识点记录</div>
          )}
        </div>
      </section>
    </div>
  );
}
