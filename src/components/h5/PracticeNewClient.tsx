'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ErrorBlock, List, Popup, Radio, Segmented, Selector, Stepper, Toast } from 'antd-mobile';
import { FixedActionBar } from './FixedActionBar';
import type { PracticeDifficulty, PracticeQuestionType, PracticeSessionRecord } from '@/features/practice/schema';

const knowledgePoints = ['两位数加法进位', '阅读理解-内容概括', '乘法口诀应用', '应用题数量关系', '图形周长计算'];
const difficultyOptions = [
  { label: '基础', value: 'EASY' },
  { label: '标准', value: 'MEDIUM' },
  { label: '挑战', value: 'HARD' },
];
const typeOptions: { label: string; value: PracticeQuestionType }[] = [
  { label: '选择题', value: 'CHOICE' },
  { label: '填空题', value: 'FILL_BLANK' },
  { label: '判断题', value: 'JUDGEMENT' },
];

export function PracticeNewClient({ childId }: { childId: string }) {
  const router = useRouter();
  const [knowledgePoint, setKnowledgePoint] = useState(knowledgePoints[0]);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('MEDIUM');
  const [questionType, setQuestionType] = useState<PracticeQuestionType>('CHOICE');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function createPractice() {
    setSubmitting(true);
    try {
      const response = await fetch('/api/practice-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, knowledgePoint, questionCount, difficulty, questionType }),
      });
      const data = (await response.json()) as { session?: PracticeSessionRecord; error?: string };
      if (!response.ok || !data.session) throw new Error(data.error ?? '创建练习失败');
      Toast.show({ icon: 'success', content: '练习已生成' });
      router.push(`/h5/practice-sessions/${data.session.id}`);
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '创建失败' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!childId) return <ErrorBlock status="empty" title="缺少孩子 ID" />;

  return (
    <div className="space-y-4 pb-28">
      <section className="rounded-[28px] bg-gradient-to-br from-emerald-500 to-cyan-500 p-5 text-white shadow-lg">
        <p className="text-sm opacity-85">知识点练习</p>
        <h1 className="mt-2 text-2xl font-bold">生成一组手机练习题</h1>
        <p className="mt-3 text-sm opacity-90">一屏一道题，提交后自动计算掌握状态。</p>
      </section>

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        <List header="练习设置">
          <List.Item extra={knowledgePoint} clickable onClick={() => setPickerVisible(true)}>知识点</List.Item>
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
              onChange={(items) => setQuestionType((items[0] as PracticeQuestionType) ?? 'CHOICE')}
            />
          </List.Item>
        </List>
      </section>

      <Popup visible={pickerVisible} onMaskClick={() => setPickerVisible(false)} bodyStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <div className="mx-auto max-w-[480px] bg-white p-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
          <div className="mb-3 text-lg font-bold text-slate-900">选择知识点</div>
          <Radio.Group value={knowledgePoint} onChange={(value) => { setKnowledgePoint(String(value)); setPickerVisible(false); }}>
            <List>
              {knowledgePoints.map((item) => <List.Item key={item} prefix={<Radio value={item} />}>{item}</List.Item>)}
            </List>
          </Radio.Group>
        </div>
      </Popup>

      <FixedActionBar>
        <Button block color="primary" size="large" className="!rounded-2xl" loading={submitting} onClick={createPractice}>开始练习</Button>
      </FixedActionBar>
    </div>
  );
}
