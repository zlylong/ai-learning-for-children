'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DotLoading, Selector, Toast } from 'antd-mobile';
import { RightOutline } from 'antd-mobile-icons';
import { WeakPointCard } from './WeakPointCard';
import { EmptyState } from './EmptyState';

const subjectOptions = [
  { label: '语文', value: 'chinese' },
  { label: '数学', value: 'math' },
  { label: '英语', value: 'english' },
];
const gradeOptions = [
  { label: '一年级', value: '一年级' },
  { label: '二年级', value: '二年级' },
  { label: '三年级', value: '三年级' },
  { label: '四年级', value: '四年级' },
  { label: '五年级', value: '五年级' },
  { label: '六年级', value: '六年级' },
];
type PracticeSubject = 'chinese' | 'math' | 'english';
type PracticeGrade = '一年级' | '二年级' | '三年级' | '四年级' | '五年级' | '六年级';

type KnowledgePointSummary = {
  id: string;
  knowledgePointId: string;
  knowledgePointText: string;
  status: 'UNKNOWN' | 'WEAK' | 'PRACTICING' | 'MASTERED' | string;
};

export function PracticeEntryClient() {
  const router = useRouter();
  const [childId, setChildId] = useState<string | null>(null);
  const [subject, setSubject] = useState<PracticeSubject>('math');
  const [grade, setGrade] = useState<PracticeGrade>('一年级');
  const [points, setPoints] = useState<KnowledgePointSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const requestSeqRef = useRef(0);

  const loadChildGrade = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/children', { cache: 'no-store' });
      const data = (await res.json()) as { children?: Array<{ id: string; grade?: string | null }> };
      const childGrade = data.children?.find((child) => child.id === id)?.grade;
      if (childGrade && gradeOptions.some((item) => item.value === childGrade)) {
        setGrade(childGrade as PracticeGrade);
      }
    } catch (error) {
      console.warn('[practice-entry] failed to load child grade', error);
    }
  }, []);

  const loadData = useCallback(async (id: string, nextSubject: PracticeSubject, nextGrade: PracticeGrade) => {
    try {
      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
      setLoading(true);
      const params = new URLSearchParams({ subject: nextSubject, grade: nextGrade });
      const res = await fetch(`/api/children/${id}/knowledge-points?${params.toString()}`, { cache: 'no-store' });
      const data = (await res.json()) as { points?: KnowledgePointSummary[] };
      if (requestSeq !== requestSeqRef.current) return;
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
      void loadChildGrade(savedId);
    } else {
      setLoading(false);
    }
  }, [loadChildGrade]);

  useEffect(() => {
    if (childId) void loadData(childId, subject, grade);
  }, [childId, loadData, subject, grade]);

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
          questionType: 'single_choice',
        }),
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

  const weakPoints = points.filter((p) => p.status === 'WEAK' || p.status === 'PRACTICING').slice(0, 3);

  const changeSubject = (value: PracticeSubject) => {
    setSubject(value);
  };

  const changeGrade = (value: PracticeGrade) => {
    setGrade(value);
  };

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="mb-3 text-sm font-bold text-slate-900">选择年级</div>
        <Selector
          columns={3}
          options={gradeOptions}
          value={[grade]}
          onChange={(items) => changeGrade((items[0] as PracticeGrade) ?? '一年级')}
        />
        <div className="mb-3 mt-4 text-sm font-bold text-slate-900">选择学科</div>
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
          <p className="mt-0.5 text-[10px] text-slate-400">根据当前年级/学科与近期学习情况自动生成</p>
        </div>
        <div className="space-y-3">
          {weakPoints.length > 0 ? (
            weakPoints.map((p) => (
              <WeakPointCard
                key={p.id}
                name={p.knowledgePointText}
                reason={p.status === 'WEAK' ? '最近错题较多' : '练习中，需巩固'}
                onPractice={() => startPractice(p)}
              />
            ))
          ) : (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/[0.04]">
              <div className="mb-2 text-3xl">🎈</div>
              <div className="text-sm text-slate-500">当前年级/学科暂无薄弱点，可从下方知识点开始练习</div>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900">所有知识点</h2>
          <span className="text-[10px] text-slate-400">当前年级/学科 · 弱项优先</span>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] divide-y divide-slate-50">
          {points.length > 0 ? points.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 active:bg-slate-50" onClick={() => startPractice(p)}>
              <div className="text-sm font-medium text-slate-700">{p.knowledgePointText}</div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  p.status === 'MASTERED' ? 'bg-green-50 text-green-600' :
                  p.status === 'WEAK' ? 'bg-rose-50 text-rose-600' :
                  p.status === 'PRACTICING' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-500'
                }`}>
                  {p.status === 'MASTERED' ? '已掌握' : p.status === 'WEAK' ? '薄弱' : p.status === 'PRACTICING' ? '练习中' : '未练习'}
                </span>
                <RightOutline className="text-xs text-slate-300" />
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
