'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Button, 
  DatePicker, 
  Empty, 
  List, 
  Selector, 
  Stepper, 
  Tag, 
  Toast, 
  Space,
  Skeleton
} from 'antd-mobile';
import dayjs from 'dayjs';
import { AppShell } from './AppShell';
import { FixedActionBar } from './FixedActionBar';

interface PreviewData {
  wrongQuestionCount: number;
  topKnowledgePoints: {
    title: string;
    wrongCount: number;
  }[];
  suggestedQuestionCount: number;
}

export function MonthlyExamClient({ childId }: { childId: string }) {
  const router = useRouter();
  
  const [subject, setSubject] = useState('数学');
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [questionCount, setQuestionCount] = useState(20);
  
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setPreview(null);
    try {
      const resp = await fetch(`/api/exams/monthly/preview?childId=${childId}&subject=${subject}&month=${month}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || '获取错题摘要失败');
      setPreview(data);
    } catch (error) {
      // Don't toast for "no wrong questions" errors here, just show empty
      console.warn(error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  }, [childId, subject, month]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleGenerate = async () => {
    if (!preview || preview.wrongQuestionCount === 0) {
      Toast.show({ icon: 'info', content: '本月没有错题，无法生成试卷' });
      return;
    }

    setGenerating(true);
    try {
      const resp = await fetch('/api/exams/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          subject,
          month,
          questionCount,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || '生成试卷失败');
      
      Toast.show({ icon: 'success', content: '月度错题卷已生成' });
      router.push(`/h5/practice-sessions/${data.sessionId}`);
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '生成试卷失败' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppShell title="月度错题卷">
      <div className="space-y-4 pb-28">
        <section className="rounded-[28px] bg-gradient-to-br from-indigo-500 to-purple-500 p-5 text-white shadow-lg">
          <p className="text-sm opacity-85">复习试卷生成</p>
          <h1 className="mt-2 text-2xl font-bold">月度错题冲刺</h1>
          <p className="mt-3 text-sm opacity-90">基于孩子本月的所有错题，由 AI 生成针对性的复习卷。</p>
        </section>

        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5 p-4">
          <List header="筛选条件">
            <List.Item extra={
              <Selector
                options={[{ label: '数学', value: '数学' }, { label: '语文', value: '语文' }, { label: '英语', value: '英语' }]}
                value={[subject]}
                onChange={v => v[0] && setSubject(v[0])}
              />
            }>学科</List.Item>
            <List.Item 
              clickable 
              onClick={() => setMonthPickerVisible(true)}
              extra={dayjs(month).format('YYYY年MM月')}
            >月份</List.Item>
          </List>
        </section>

        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-black/5 p-4">
          <div className="mb-3 text-sm font-medium text-slate-500">本月错题概览</div>
          
          {loading ? (
            <div className="space-y-3">
              <Skeleton.Title animated />
              <Skeleton.Paragraph lineCount={3} animated />
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">本月错题数</span>
                <span className="text-xl font-bold text-indigo-600">{preview.wrongQuestionCount}</span>
              </div>
              
              <div>
                <div className="mb-2 text-sm text-slate-500">高频薄弱知识点 (Top 5)</div>
                <Space wrap>
                  {preview.topKnowledgePoints.map((kp, idx) => (
                    <Tag key={idx} color="warning" fill="outline" className="px-2 py-1">
                      {kp.title} ({kp.wrongCount})
                    </Tag>
                  ))}
                </Space>
              </div>

              <div className="pt-2">
                <List.Item extra={
                  <Stepper 
                    min={5} 
                    max={30} 
                    value={questionCount} 
                    onChange={v => setQuestionCount(Number(v))} 
                  />
                }>生成题目数量</List.Item>
              </div>
            </div>
          ) : (
            <Empty description="该月暂无错题记录" />
          )}
        </section>

        <DatePicker
          visible={monthPickerVisible}
          onClose={() => setMonthPickerVisible(false)}
          precision="month"
          onConfirm={val => {
            setMonth(dayjs(val).format('YYYY-MM'));
          }}
          max={new Date()}
        />

        <FixedActionBar>
          <Button 
            block 
            color="primary" 
            size="large" 
            className="!rounded-2xl" 
            loading={generating}
            disabled={!preview || preview.wrongQuestionCount === 0}
            onClick={handleGenerate}
          >
            生成月度错题卷
          </Button>
        </FixedActionBar>
      </div>
    </AppShell>
  );
}
