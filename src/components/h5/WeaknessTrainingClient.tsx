'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DotLoading, Empty, List, Selector, Stepper, Tag, Toast } from 'antd-mobile';
import { FixedActionBar } from './FixedActionBar';
import { buildWeaknessPracticePayload, selectWeaknessFocusPoints, type WeaknessFocusPoint, type WeaknessPointInput } from './weakness-training-actions';
import type { PracticeDifficulty, PracticeQuestionType, PracticeSessionRecord } from '@/features/practice/schema';

const difficultyOptions: { label: string; value: PracticeDifficulty }[] = [
  { label: '基础', value: 'easy' },
  { label: '标准', value: 'medium' },
  { label: '挑战', value: 'hard' },
];

const typeOptions: { label: string; value: PracticeQuestionType }[] = [
  { label: '选择题', value: 'single_choice' },
  { label: '填空题', value: 'fill_blank' },
  { label: '简答题', value: 'short_answer' },
];

function statusText(status: string) {
  if (status === 'WEAK') return '薄弱';
  if (status === 'PRACTICING') return '练习中';
  if (status === 'MASTERED') return '已掌握';
  return '待评估';
}

function statusColor(status: string): 'danger' | 'warning' | 'success' | 'default' {
  if (status === 'WEAK') return 'danger';
  if (status === 'PRACTICING') return 'warning';
  if (status === 'MASTERED') return 'success';
  return 'default';
}

export function WeaknessTrainingClient({ childId }: { childId: string }) {
  const router = useRouter();
  const [points, setPoints] = useState<WeaknessFocusPoint[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [questionCount, setQuestionCount] = useState(8);
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('medium');
  const [questionType, setQuestionType] = useState<PracticeQuestionType>('single_choice');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const selectedPoint = useMemo(() => points.find((point) => point.id === selectedId) ?? points[0], [points, selectedId]);

  const loadPoints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/children/${childId}/knowledge-points`, { cache: 'no-store' });
      const data = (await response.json()) as { points?: WeaknessPointInput[]; error?: string };
      if (!response.ok) throw new Error(data.error || '薄弱点加载失败');
      const nextPoints = selectWeaknessFocusPoints(data.points ?? []);
      setPoints(nextPoints);
      setSelectedId((current) => current || nextPoints[0]?.id || '');
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '薄弱点加载失败' });
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  async function startTraining(point = selectedPoint) {
    if (!point) {
      Toast.show({ icon: 'info', content: '暂无可训练的薄弱点' });
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch('/api/practice-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildWeaknessPracticePayload(childId, point, { questionCount, difficulty, questionType })),
      });
      const data = (await response.json()) as { sessionId?: string; session?: PracticeSessionRecord; error?: string };
      if (!response.ok || !data.sessionId) throw new Error(data.error || '专项训练生成失败');
      Toast.show({ icon: 'success', content: '专项训练已生成' });
      router.push(`/h5/practice-sessions/${data.sessionId}`);
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '专项训练生成失败' });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><DotLoading /></div>;

  return (
    <div className="space-y-4 pb-28">
      <section className="rounded-[28px] bg-gradient-to-br from-rose-500 to-orange-500 p-5 text-white shadow-lg">
        <p className="text-sm opacity-85">薄弱点专项</p>
        <h1 className="mt-2 text-2xl font-bold">优先攻克长期薄弱项</h1>
        <p className="mt-3 text-sm opacity-90">按薄弱状态、错题数和掌握分排序，自动选择最需要强化的知识点生成练习。</p>
      </section>

      {points.length === 0 ? (
        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <Empty description="暂无薄弱点记录。请先上传试卷或完成几次知识点练习，系统会自动沉淀专项训练目标。" />
        </section>
      ) : (
        <>
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">本次专项目标</div>
                <div className="mt-1 text-xs text-slate-400">默认选择当前最薄弱知识点，可手动切换</div>
              </div>
              <Tag color={statusColor(selectedPoint?.status ?? 'UNKNOWN')}>{statusText(selectedPoint?.status ?? 'UNKNOWN')}</Tag>
            </div>
            <Selector
              columns={1}
              value={selectedPoint ? [selectedPoint.id] : []}
              options={points.map((point) => ({ label: `${point.title} · 错 ${point.wrongCount} 题`, value: point.id }))}
              onChange={(items) => setSelectedId(String(items[0] ?? ''))}
            />
          </section>

          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <List header="训练参数">
              <List.Item extra={<Stepper min={5} max={15} value={questionCount} onChange={(value) => setQuestionCount(Number(value))} />}>题目数量</List.Item>
              <List.Item description="薄弱点建议使用标准或挑战难度">
                <div className="mb-3 font-medium text-slate-900">难度</div>
                <Selector columns={3} options={difficultyOptions} value={[difficulty]} onChange={(items) => setDifficulty((items[0] as PracticeDifficulty) ?? 'medium')} />
              </List.Item>
              <List.Item>
                <div className="mb-3 font-medium text-slate-900">题型</div>
                <Selector columns={3} options={typeOptions} value={[questionType]} onChange={(items) => setQuestionType((items[0] as PracticeQuestionType) ?? 'single_choice')} />
              </List.Item>
            </List>
          </section>

          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <List header="薄弱点排序">
              {points.map((point) => (
                <List.Item
                  key={point.id}
                  clickable
                  onClick={() => setSelectedId(point.id)}
                  extra={<Button size="mini" color="primary" fill="outline" onClick={(event) => { event.stopPropagation(); void startTraining(point); }}>训练</Button>}
                  description={`错题 ${point.wrongCount} · 练习 ${point.practiceCount} · 掌握分 ${Math.round(point.masteryScore)}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{point.title}</span>
                    <Tag color={statusColor(point.status)}>{statusText(point.status)}</Tag>
                  </div>
                </List.Item>
              ))}
            </List>
          </section>
        </>
      )}

      <FixedActionBar>
        <Button block color="primary" size="large" className="!rounded-2xl" loading={generating} disabled={!selectedPoint} onClick={() => void startTraining()}>
          生成薄弱点专项训练
        </Button>
      </FixedActionBar>
    </div>
  );
}
