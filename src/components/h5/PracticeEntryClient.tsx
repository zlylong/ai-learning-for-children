'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DotLoading, Popup, Selector, Toast } from 'antd-mobile';
import { RightOutline } from 'antd-mobile-icons';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';
import { buildRewrongWarnings, findWarningForPoint, type RewrongWarning } from './remediation-insights';
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
  { label: '七年级', value: '七年级' },
  { label: '八年级', value: '八年级' },
  { label: '九年级', value: '九年级' },
];
const intensityOptions = [
  { label: '轻量 · 3题 · 约5分钟', value: 'light' },
  { label: '标准 · 5题 · 约10分钟', value: 'standard' },
  { label: '强化 · 10题 · 约20分钟', value: 'intensive' },
];
const intensityProfiles = {
  light: { questionCount: 3, difficulty: 'easy' },
  standard: { questionCount: 5, difficulty: 'medium' },
  intensive: { questionCount: 10, difficulty: 'hard' },
} as const;
const questionModeOptions = [
  { label: '单选', value: 'single_choice' },
  { label: '单选 + 填空', value: 'mixed' },
];
const teachingTagOptions = [
  { label: '全部', value: 'all' },
  { label: '易错', value: '易错' },
  { label: '基础', value: '基础' },
  { label: '拔高', value: '拔高' },
  { label: '常考', value: '常考' },
];
type PracticeSubject = 'chinese' | 'math' | 'english';
type PracticeGrade = '一年级' | '二年级' | '三年级' | '四年级' | '五年级' | '六年级' | '七年级' | '八年级' | '九年级';
type PracticeIntensity = keyof typeof intensityProfiles;
type PracticeQuestionMode = 'single_choice' | 'mixed';
type PracticeViewMode = 'child' | 'parent';
type TeachingTagFilter = 'all' | '易错' | '基础' | '拔高' | '常考';

type KnowledgePointSummary = {
  id: string;
  knowledgePointId: string;
  knowledgePointText: string;
  status: 'UNKNOWN' | 'WEAK' | 'PRACTICING' | 'MASTERED' | string;
  summary?: string | null;
  explanation?: {
    why: string;
    howToLearn: string;
    steps: string[];
  } | null;
  examples?: Array<{
    question: string;
    answer: string;
    analysis: string;
    difficulty?: string | null;
    type?: string | null;
  }> | null;
  keyConcepts?: string[] | null;
  commonMistakes?: Array<{ type: string; description: string; remediation: string }> | null;
  masteryCriteria?: string[] | null;
  teachingTags?: string[] | null;
};

export function PracticeEntryClient() {
  const router = useRouter();
  const [childId, setChildId] = useState<string | null>(null);
  const [subject, setSubject] = useState<PracticeSubject>('math');
  const [grade, setGrade] = useState<PracticeGrade>('一年级');
  const [points, setPoints] = useState<KnowledgePointSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailPoint, setDetailPoint] = useState<KnowledgePointSummary | null>(null);
  const [requestedPoint, setRequestedPoint] = useState<{ id?: string; title?: string } | null>(null);
  const [intensity, setIntensity] = useState<PracticeIntensity>('standard');
  const [questionMode, setQuestionMode] = useState<PracticeQuestionMode>('mixed');
  const [viewMode, setViewMode] = useState<PracticeViewMode>('child');
  const [tagFilter, setTagFilter] = useState<TeachingTagFilter>('all');
  const [rewrongWarnings, setRewrongWarnings] = useState<RewrongWarning[]>([]);
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
      const [pointRes, wrongRes] = await Promise.all([
        fetch(`/api/children/${id}/knowledge-points?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/wrong-questions?childId=${encodeURIComponent(id)}`, { cache: 'no-store' }),
      ]);
      const data = (await pointRes.json()) as { points?: KnowledgePointSummary[] };
      const wrongData = (await wrongRes.json()) as { wrongQuestions?: WrongQuestionRecord[] };
      if (requestSeq !== requestSeqRef.current) return;
      setPoints(data.points || []);
      setRewrongWarnings(buildRewrongWarnings(wrongData.wrongQuestions || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryChildId = params.get('childId')?.trim() || '';
    const selectedId = queryChildId || localStorage.getItem('selectedChildId');
    const pointId = params.get('knowledgePointId')?.trim() || undefined;
    const pointTitle = params.get('knowledgePoint')?.trim() || undefined;
    const isRemediation = params.get('remediation') === '1';
    const savedMode = localStorage.getItem('practiceViewMode');
    if (savedMode === 'child' || savedMode === 'parent') setViewMode(savedMode);
    const querySubject = params.get('subject')?.trim();
    if (isRemediation) setIntensity('light');
    if (querySubject && subjectOptions.some((item) => item.value === querySubject)) {
      setSubject(querySubject as PracticeSubject);
    }
    if (pointId || pointTitle) setRequestedPoint({ id: pointId, title: pointTitle });

    if (selectedId) {
      if (queryChildId) localStorage.setItem('selectedChildId', queryChildId);
      setChildId(selectedId);
      void loadChildGrade(selectedId);
    } else {
      setLoading(false);
    }
  }, [loadChildGrade]);

  useEffect(() => {
    if (childId) void loadData(childId, subject, grade);
  }, [childId, loadData, subject, grade]);

  useEffect(() => {
    if (!requestedPoint || detailPoint || points.length === 0) return;
    const matched = points.find((point) => {
      const sameId = requestedPoint.id && (point.knowledgePointId === requestedPoint.id || point.id === requestedPoint.id);
      const sameTitle = requestedPoint.title && point.knowledgePointText === requestedPoint.title;
      return sameId || sameTitle;
    });
    if (matched) {
      setDetailPoint(matched);
      if (findWarningForPoint(rewrongWarnings, matched)) setIntensity('light');
      setRequestedPoint(null);
    }
  }, [detailPoint, points, requestedPoint, rewrongWarnings]);

  const startPractice = async (point: KnowledgePointSummary) => {
    if (!childId) return;
    const profile = intensityProfiles[intensity];
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
          questionCount: profile.questionCount,
          difficulty: profile.difficulty,
          questionType: questionMode,
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

  const filteredPoints = tagFilter === 'all' ? points : points.filter((p) => p.teachingTags?.includes(tagFilter));
  const weakPoints = filteredPoints.filter((p) => p.status === 'WEAK' || p.status === 'PRACTICING').slice(0, 3);
  const parentMode = viewMode === 'parent';

  const changeViewMode = (mode: PracticeViewMode) => {
    setViewMode(mode);
    localStorage.setItem('practiceViewMode', mode);
  };

  const changeSubject = (value: PracticeSubject) => {
    setSubject(value);
  };

  const changeGrade = (value: PracticeGrade) => {
    setGrade(value);
  };

  const openPointDetail = (point: KnowledgePointSummary) => {
    setDetailPoint(point);
    if (findWarningForPoint(rewrongWarnings, point)) setIntensity('light');
  };

  const detailWarning = detailPoint ? findWarningForPoint(rewrongWarnings, detailPoint) : null;

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-900">练习模式</div>
            <div className="mt-1 text-[10px] text-slate-400">孩子自学更清爽，家长陪练可调参数</div>
          </div>
          <Selector
            columns={2}
            options={[{ label: '孩子模式', value: 'child' }, { label: '家长模式', value: 'parent' }]}
            value={[viewMode]}
            onChange={(items) => changeViewMode((items[0] as PracticeViewMode) ?? 'child')}
          />
        </div>

        {parentMode ? (
          <>
            <div className="mb-3 mt-4 text-sm font-bold text-slate-900">选择年级</div>
            <Selector columns={3} options={gradeOptions} value={[grade]} onChange={(items) => changeGrade((items[0] as PracticeGrade) ?? '一年级')} />
            <div className="mb-3 mt-4 text-sm font-bold text-slate-900">选择学科</div>
            <Selector columns={3} options={subjectOptions} value={[subject]} onChange={(items) => changeSubject((items[0] as PracticeSubject) ?? 'math')} />
            <div className="mb-3 mt-4 text-sm font-bold text-slate-900">教学标签</div>
            <Selector columns={3} options={teachingTagOptions} value={[tagFilter]} onChange={(items) => setTagFilter((items[0] as TeachingTagFilter) ?? 'all')} />
            <div className="mb-3 mt-4 text-sm font-bold text-slate-900">练习强度</div>
            <Selector columns={1} options={intensityOptions} value={[intensity]} onChange={(items) => setIntensity((items[0] as PracticeIntensity) ?? 'standard')} />
            <div className="mb-3 mt-4 text-sm font-bold text-slate-900">题型</div>
            <Selector columns={2} options={questionModeOptions} value={[questionMode]} onChange={(items) => setQuestionMode((items[0] as PracticeQuestionMode) ?? 'mixed')} />
          </>
        ) : (
          <div className="rounded-3xl bg-cyan-50 p-4 text-center">
            <div className="text-4xl">🚀</div>
            <div className="mt-2 text-lg font-black text-cyan-900">选一个知识点，马上开始</div>
            <div className="mt-1 text-xs text-cyan-700">系统会自动使用适合孩子的题量和题型</div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 px-1">
          <h2 className="text-sm font-bold text-slate-900">推荐练习</h2>
          <p className="mt-0.5 text-[10px] text-slate-400">{parentMode ? '根据年级/学科、错题频率、练习状态与标签过滤自动生成' : '优先推荐最需要巩固的内容'}</p>
        </div>
        <div className="space-y-3">
          {weakPoints.length > 0 ? (
            weakPoints.map((p) => (
              <WeakPointCard
                key={p.id}
                name={p.knowledgePointText}
                reason={parentMode ? (findWarningForPoint(rewrongWarnings, p)?.message ?? (p.status === 'WEAK' ? '最近错题较多' : '练习中，需巩固')) : '先理解，再闯关'}
                onPractice={() => openPointDetail(p)}
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
          <span className="text-[10px] text-slate-400">{parentMode ? '当前筛选 · 弱项优先' : '点一下开始'}</span>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] divide-y divide-slate-50">
          {filteredPoints.length > 0 ? filteredPoints.map((p) => (
            <div key={p.id} className="p-4 active:bg-slate-50" onClick={() => openPointDetail(p)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800">{p.knowledgePointText}</div>
                  {p.summary ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{p.summary}</p> : null}
                  {parentMode && p.keyConcepts?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.keyConcepts.slice(0, 3).map((concept) => <span key={concept} className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] text-cyan-700">{concept}</span>)}
                    </div>
                  ) : null}
                  {parentMode && p.teachingTags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.teachingTags.map((tag) => <span key={tag} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">{tag}</span>)}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
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
            </div>
          )) : (
            <div className="p-8 text-center text-xs text-slate-400">暂无知识点记录</div>
          )}
        </div>
      </section>

      <Popup
        visible={Boolean(detailPoint)}
        onMaskClick={() => setDetailPoint(null)}
        bodyStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88vh', overflow: 'hidden' }}
      >
        {detailPoint ? (
          <div className="mx-auto flex h-[88vh] max-w-[480px] flex-col bg-white">
            <div className="shrink-0 border-b border-slate-100 px-5 py-4">
              <p className="text-xs font-semibold text-emerald-600">知识点讲解</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{detailPoint.knowledgePointText}</h3>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 pb-28">
              {detailWarning ? (
                <section className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
                  <div className="font-bold">⚠️ 再错预警</div>
                  <p className="mt-1">{detailWarning.message}</p>
                  <p className="mt-1 text-xs text-rose-500">已自动切换为“轻量 · 低难度”练习，建议先读讲解和例题再开始。</p>
                </section>
              ) : null}
              {detailPoint.summary ? <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{detailPoint.summary}</p> : null}

              {detailPoint.explanation ? (
                <section className="space-y-3">
                  <div className="text-sm font-bold text-slate-900">先理解</div>
                  <div className="space-y-3 rounded-2xl bg-emerald-50/60 p-4 text-sm leading-6 text-slate-700">
                    <div>
                      <div className="font-semibold text-emerald-900">为什么学</div>
                      <p>{detailPoint.explanation.why}</p>
                    </div>
                    <div>
                      <div className="font-semibold text-emerald-900">怎么学</div>
                      <p>{detailPoint.explanation.howToLearn}</p>
                    </div>
                    <ol className="list-decimal space-y-1 pl-5">
                      {detailPoint.explanation.steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  </div>
                </section>
              ) : null}

              {detailPoint.keyConcepts?.length ? (
                <section>
                  <div className="mb-2 text-sm font-bold text-slate-900">关键概念</div>
                  <div className="flex flex-wrap gap-2">
                    {detailPoint.keyConcepts.map((concept) => <span key={concept} className="rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-700">{concept}</span>)}
                  </div>
                </section>
              ) : null}

              {detailPoint.examples?.length ? (
                <section className="space-y-3">
                  <div className="text-sm font-bold text-slate-900">例题与解析</div>
                  {detailPoint.examples.map((example, index) => (
                    <article key={`${example.question}-${index}`} className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-6">
                      <div className="font-semibold text-amber-900">例题 {index + 1}</div>
                      <p className="mt-1 text-slate-800">{example.question}</p>
                      <div className="mt-3 rounded-xl bg-white/80 p-3">
                        <div className="font-medium text-slate-900">参考答案</div>
                        <p className="text-slate-700">{example.answer}</p>
                        <div className="mt-2 font-medium text-slate-900">解析</div>
                        <p className="text-slate-700">{example.analysis}</p>
                      </div>
                    </article>
                  ))}
                </section>
              ) : null}

              {detailPoint.commonMistakes?.length ? (
                <section className="space-y-2">
                  <div className="text-sm font-bold text-slate-900">常见错误与订正</div>
                  {detailPoint.commonMistakes.map((mistake, index) => (
                    <div key={`${mistake.type}-${index}`} className="rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-slate-700">
                      <div className="font-semibold text-rose-700">{mistake.description}</div>
                      <p className="mt-1">订正建议：{mistake.remediation}</p>
                    </div>
                  ))}
                </section>
              ) : null}

              {detailPoint.masteryCriteria?.length ? (
                <section>
                  <div className="mb-2 text-sm font-bold text-slate-900">掌握标准</div>
                  <ul className="list-disc space-y-1 rounded-2xl bg-slate-50 p-4 pl-8 text-sm leading-6 text-slate-700">
                    {detailPoint.masteryCriteria.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              ) : null}
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-white px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
              {parentMode ? (
                <div className="mb-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  本次设置：{intensityOptions.find((option) => option.value === intensity)?.label} · {questionMode === 'mixed' ? '单选 + 填空混合' : '单选题'}
                </div>
              ) : null}
              <Button block color="primary" size="large" className="!h-14 !rounded-2xl !text-base !font-black" onClick={() => startPractice(detailPoint)}>{parentMode ? '根据这个知识点练习' : '开始闯关'}</Button>
            </div>
          </div>
        ) : null}
      </Popup>
    </div>
  );
}
