'use client';

import { useEffect, useState, useCallback } from 'react';
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

export function PracticeNewClient({ childId }: { childId: string }) {
  const router = useRouter();
  const [knowledgePoints, setKnowledgePoints] = useState<PracticeKnowledgePointOption[]>([]);
  const [knowledgePointId, setKnowledgePointId] = useState('');
  const [loading, setLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('medium');
  const [questionType, setQuestionType] = useState<PracticeQuestionType>('single_choice');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadKnowledgePoints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/children/${childId}/knowledge-points`, { cache: 'no-store' });
      const data = (await response.json()) as { points?: PracticeKnowledgePointInput[] };
      const nextPoints = normalizePracticeKnowledgePoints(data.points ?? []);
      const params = new URLSearchParams(window.location.search);
      const requestedId = params.get('knowledgePointId')?.trim() ?? '';
      const requestedTitle = params.get('knowledgePoint')?.trim() ?? '';
      const pointsWithRequested = requestedId && requestedTitle && !nextPoints.some((item) => item.id === requestedId)
        ? [{ id: requestedId, title: requestedTitle, status: 'WEAK', wrongCount: 1 }, ...nextPoints]
        : nextPoints;
      setKnowledgePoints(pointsWithRequested);
      setKnowledgePointId((current) => current || (requestedId && pointsWithRequested.some((item) => item.id === requestedId) ? requestedId : pointsWithRequested[0]?.id || ''));
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '读取知识点失败' });
      setKnowledgePoints([]);
    } finally {
      setLoading(false);
    }
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
        body: JSON.stringify({ childId, knowledgePointId, knowledgePoint: knowledgePoints.find((item) => item.id === knowledgePointId)?.title, questionCount, difficulty, questionType }),
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

  return (
    <div className="space-y-4 pb-28">
      <section className="rounded-[28px] bg-gradient-to-br from-emerald-500 to-cyan-500 p-5 text-white shadow-lg">
        <p className="text-sm opacity-85">知识点练习</p>
        <h1 className="mt-2 text-2xl font-bold">生成一组手机练习题</h1>
        <p className="mt-3 text-sm opacity-90">从孩子已有知识点中选择，按当前 AI 功能路由生成一组练习题。</p>
      </section>

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        <List header="练习设置">
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
          还没有可练习的知识点。请先上传试卷或处理错题，系统会自动沉淀孩子的知识点。
        </section>
      ) : null}

      <Popup visible={pickerVisible} onMaskClick={() => setPickerVisible(false)} bodyStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <div className="mx-auto max-w-[480px] bg-white p-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
          <div className="mb-3 text-lg font-bold text-slate-900">选择知识点</div>
          <Radio.Group value={knowledgePointId} onChange={(value) => { setKnowledgePointId(String(value)); setPickerVisible(false); }}>
            <List>
              {knowledgePoints.map((item) => <List.Item key={item.id} prefix={<Radio value={item.id} />}>{item.title}</List.Item>)}
            </List>
          </Radio.Group>
        </div>
      </Popup>

      <FixedActionBar>
        <Button block color="primary" size="large" className="!rounded-2xl" loading={submitting} disabled={knowledgePoints.length === 0} onClick={createPractice}>开始练习</Button>
      </FixedActionBar>
    </div>
  );
}
