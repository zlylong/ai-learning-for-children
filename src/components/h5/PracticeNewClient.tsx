'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DotLoading, ErrorBlock, List, Popup, Radio, Segmented, Selector, Stepper, Toast } from 'antd-mobile';
import { FixedActionBar } from './FixedActionBar';
import type { PracticeDifficulty, PracticeQuestionType, PracticeSessionRecord } from '@/features/practice/schema';
import { normalizePracticeKnowledgePoints, type PracticeKnowledgePointOption, type PracticeKnowledgePointInput } from './practice-entry-actions';

const difficultyOptions = [
  { label: '基础', value: 'easy' },
  { label: '标准', value: 'medium' },
  { label: '挑战', value: 'hard' },
];
const typeOptions: { label: string; value: PracticeQuestionType }[] = [
  { label: '选择题', value: 'single_choice' },
  { label: '填空题', value: 'fill_blank' },
  { label: '简答题', value: 'short_answer' },
];

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

export function PracticeNewClient({ childId }: { childId: string }) {
  const router = useRouter();
  const [subject, setSubject] = useState<PracticeSubject>('math');
  const [grade, setGrade] = useState<PracticeGrade>('一年级');
  const [knowledgePoints, setKnowledgePoints] = useState<PracticeKnowledgePointOption[]>([]);
  const [knowledgePointId, setKnowledgePointId] = useState('');
  const [loading, setLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('medium');
  const [questionType, setQuestionType] = useState<PracticeQuestionType>('single_choice');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const requestSeqRef = useRef(0);

  const loadKnowledgePoints = useCallback(async () => {
    try {
      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const query = new URLSearchParams({ subject, grade });
      const response = await fetch(`/api/children/${childId}/knowledge-points?${query.toString()}`, { cache: 'no-store' });
      const data = (await response.json()) as { points?: PracticeKnowledgePointInput[] };
      if (requestSeq !== requestSeqRef.current) return;
      const nextPoints = normalizePracticeKnowledgePoints(data.points ?? []);
      const requestedId = params.get('knowledgePointId')?.trim() ?? '';
      const requestedTitle = params.get('knowledgePoint')?.trim() ?? '';
      const pointsWithRequested = requestedId && requestedTitle && !nextPoints.some((item) => item.id === requestedId)
        ? [{ id: requestedId, title: requestedTitle, status: 'WEAK' }, ...nextPoints]
        : nextPoints;
      setKnowledgePoints(pointsWithRequested);
      setKnowledgePointId((current) => {
        if (current && pointsWithRequested.some((item) => item.id === current)) return current;
        if (requestedId && pointsWithRequested.some((item) => item.id === requestedId)) return requestedId;
        return pointsWithRequested[0]?.id || '';
      });
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '读取知识点失败' });
      setKnowledgePoints([]);
    } finally {
      setLoading(false);
    }
  }, [childId, subject, grade]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSubject = params.get('subject') as PracticeSubject | null;
    const requestedGrade = params.get('grade') as PracticeGrade | null;
    if (requestedSubject && subjectOptions.some((item) => item.value === requestedSubject)) {
      setSubject(requestedSubject);
    }
    if (requestedGrade && gradeOptions.some((item) => item.value === requestedGrade)) {
      setGrade(requestedGrade);
      return;
    }

    void fetch('/api/children', { cache: 'no-store' })
      .then((res) => res.json() as Promise<{ children?: Array<{ id: string; grade?: string | null }> }>)
      .then((data) => {
        const childGrade = data.children?.find((child) => child.id === childId)?.grade;
        if (childGrade && gradeOptions.some((item) => item.value === childGrade)) {
          setGrade(childGrade as PracticeGrade);
        }
      })
      .catch(() => undefined);
  }, [childId]);

  useEffect(() => {
    if (childId) void loadKnowledgePoints();
  }, [childId, loadKnowledgePoints]);

  async function createPractice() {
    if (!knowledgePointId) {
      Toast.show({ icon: 'fail', content: '请先上传试卷或选择一个知识点' });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/practice-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, subject, knowledgePointId, knowledgePoint: knowledgePoints.find((item) => item.id === knowledgePointId)?.title, questionCount, difficulty, questionType }),
      });
      const data = (await response.json()) as { sessionId?: string; session?: PracticeSessionRecord; error?: string };
      if (!response.ok || !data.sessionId) throw new Error(data.error ?? '创建练习失败');
      Toast.show({ icon: 'success', content: '练习已生成' });
      router.push(`/h5/practice-sessions/${data.sessionId}`);
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '创建失败' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!childId) return <ErrorBlock status="empty" title="缺少孩子 ID" />;
  if (loading) return <div className="flex justify-center py-12"><DotLoading /></div>;

  const selectedKnowledgePoint = knowledgePoints.find((item) => item.id === knowledgePointId);

  return (
    <div className="space-y-4 pb-28">
      <section className="rounded-[28px] bg-gradient-to-br from-emerald-500 to-cyan-500 p-5 text-white shadow-lg">
        <p className="text-sm opacity-85">知识点练习</p>
        <h1 className="mt-2 text-2xl font-bold">生成一组手机练习题</h1>
        <p className="mt-3 text-sm opacity-90">按年级、学科和知识点生成一组练习题，可跨年级提前预习或回顾巩固。</p>
      </section>

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        <List header="练习设置">
          <List.Item>
            <div className="mb-3 font-medium text-slate-900">年级</div>
            <Selector
              columns={3}
              options={gradeOptions}
              value={[grade]}
              onChange={(items) => {
                const nextGrade = (items[0] as PracticeGrade) ?? '一年级';
                setGrade(nextGrade);
                setKnowledgePointId('');
              }}
            />
          </List.Item>
          <List.Item>
            <div className="mb-3 font-medium text-slate-900">学科</div>
            <Selector
              columns={3}
              options={subjectOptions}
              value={[subject]}
              onChange={(items) => {
                const nextSubject = (items[0] as PracticeSubject) ?? 'math';
                setSubject(nextSubject);
                setKnowledgePointId('');
              }}
            />
          </List.Item>
          <List.Item extra={knowledgePoints.find((item) => item.id === knowledgePointId)?.title ?? '暂无知识点'} clickable={knowledgePoints.length > 0} onClick={() => knowledgePoints.length > 0 && setPickerVisible(true)}>知识点</List.Item>
          <List.Item extra={<Stepper min={1} max={10} value={questionCount} onChange={(value) => setQuestionCount(Number(value))} />}>题目数量</List.Item>
          <List.Item description="根据孩子当前掌握情况选择难度">
            <div className="mb-3 font-medium text-slate-900">难度</div>
            <Segmented options={difficultyOptions} value={difficulty} onChange={(value) => setDifficulty(value as PracticeDifficulty)} />
          </List.Item>
          <List.Item>
            <div className="mb-3 font-medium text-slate-900">题型</div>
            <Selector
              columns={3}
              options={typeOptions}
              value={[questionType]}
              onChange={(items) => setQuestionType((items[0] as PracticeQuestionType) ?? 'single_choice')}
            />
          </List.Item>
        </List>
      </section>

      {knowledgePoints.length === 0 ? (
        <section className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-black/5">
当前年级/学科还没有可练习的知识点。可切换年级、语文/数学/英语，或先上传试卷，系统会自动沉淀孩子的知识点。
        </section>
      ) : null}

      {selectedKnowledgePoint ? (
        <section className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-emerald-600">知识点解释</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{selectedKnowledgePoint.title}</h2>
            </div>
            <button type="button" className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700" onClick={() => setPickerVisible(true)}>切换</button>
          </div>
          {selectedKnowledgePoint.summary ? <p className="text-sm leading-6 text-slate-600">{selectedKnowledgePoint.summary}</p> : null}
          {selectedKnowledgePoint.explanation ? (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <div>
                <div className="font-semibold text-slate-900">为什么学</div>
                <p>{selectedKnowledgePoint.explanation.why}</p>
              </div>
              <div>
                <div className="font-semibold text-slate-900">怎么学</div>
                <p>{selectedKnowledgePoint.explanation.howToLearn}</p>
              </div>
              <ol className="list-decimal space-y-1 pl-5">
                {selectedKnowledgePoint.explanation.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </div>
          ) : null}
          {selectedKnowledgePoint.keyConcepts?.length ? (
            <div className="flex flex-wrap gap-2">
              {selectedKnowledgePoint.keyConcepts.map((concept) => <span key={concept} className="rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-700">{concept}</span>)}
            </div>
          ) : null}
          {selectedKnowledgePoint.examples?.length ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">例题与解析</div>
              {selectedKnowledgePoint.examples.slice(0, 2).map((example, index) => (
                <article key={`${example.question}-${index}`} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm leading-6">
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
            </div>
          ) : null}
        </section>
      ) : null}

      <Popup
        visible={pickerVisible}
        onMaskClick={() => setPickerVisible(false)}
        bodyStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82vh', overflow: 'hidden' }}
      >
        <div className="mx-auto flex h-[82vh] max-w-[480px] flex-col bg-white p-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
          <div className="mb-3 shrink-0 text-lg font-bold text-slate-900">选择知识点</div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl">
            <Radio.Group value={knowledgePointId} onChange={(value) => { setKnowledgePointId(String(value)); setPickerVisible(false); }}>
              <List>
                {knowledgePoints.map((item) => (
                  <List.Item key={item.id} prefix={<Radio value={item.id} />} description={item.summary ?? item.explanation?.why}>
                    {item.title}
                  </List.Item>
                ))}
              </List>
            </Radio.Group>
          </div>
        </div>
      </Popup>

      <FixedActionBar>
        <Button block color="primary" size="large" className="!rounded-2xl" loading={submitting} disabled={knowledgePoints.length === 0} onClick={createPractice}>开始练习</Button>
      </FixedActionBar>
    </div>
  );
}
