'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DotLoading, Button } from 'antd-mobile';
import { 
  FileOutline, 
  PieOutline, 
  PlayOutline, 
  ScanningOutline,
  CalendarOutline,
  StarOutline
} from 'antd-mobile-icons';
import type { ChildProfile } from '@/features/children/schema';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';
import { ChildSwitcher } from './ChildSwitcher';
import { StatCard } from './StatCard';
import { ActionCard } from './ActionCard';
import { EmptyState } from './EmptyState';

export function HomeClient() {
  const router = useRouter();
  const [childId, setChildId] = useState<string | null>(null);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [stats, setStats] = useState({
    weakPoints: 0,
    monthWrong: 0,
    accuracy: 0,
  });
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const childRes = await fetch('/api/children', { cache: 'no-store' });
      const childData = await childRes.json();
      const currentChild = childData.children.find((c: Record<string, any>) => c.id === id);
      
      if (!currentChild) {
        localStorage.removeItem('selectedChildId');
        setChildId(null);
        setLoading(false);
        return;
      }
      setChild(currentChild);

      const wrongRes = await fetch(`/api/wrong-questions?childId=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const wrongData = await wrongRes.json();
      const questions: WrongQuestionRecord[] = wrongData.wrongQuestions || [];
      
      const now = new Date();
      const thisMonth = questions.filter(q => {
        const qDate = new Date(q.createdAt);
        return qDate.getMonth() === now.getMonth() && qDate.getFullYear() === now.getFullYear();
      });

      const weakKpSet = new Set<string>();
      questions.forEach(q => {
        q.knowledgePoints.forEach(kp => weakKpSet.add(kp.title));
      });

      const practiceRes = await fetch(`/api/practice-sessions?childId=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const practiceData = await practiceRes.json();
      const sessions = practiceData.sessions || [];
      const completedSessions = sessions.filter((s: Record<string, any>) => s.status === 'COMPLETED');
      const avgAccuracy = completedSessions.length > 0 
        ? Math.round(completedSessions.reduce((acc: number, s: Record<string, any>) => acc + (s.result?.accuracy || 0), 0) / completedSessions.length)
        : 0;

      setStats({
        weakPoints: weakKpSet.size,
        monthWrong: thisMonth.length,
        accuracy: avgAccuracy,
      });

      if (weakKpSet.size > 0) {
        const firstKp = Array.from(weakKpSet)[0];
        setRecommendation(`建议今天练习：${firstKp}`);
      } else {
        setRecommendation('暂无推荐练习，建议上传试卷分析');
      }

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
      loadData(savedId);
    } else {
      setLoading(false);
    }
  }, [loadData]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <DotLoading color="primary" />
    </div>
  );

  if (!childId || !child) {
    return (
      <EmptyState 
        title="欢迎使用 AI 学习助手" 
        desc="还没有选择孩子，点击下方按钮开始。" 
        actionText="选择孩子" 
        onAction={() => router.push('/h5/children/select')}
        icon="✨"
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <ChildSwitcher name={child.name} grade={child.grade} id={child.id} />

      <section className="rounded-[32px] bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white shadow-lg shadow-indigo-200">
        <div className="flex items-center gap-2 text-indigo-100 opacity-80">
          <StarOutline fontSize={16} />
          <span className="text-xs font-bold uppercase tracking-wider">今日建议</span>
        </div>
        <div className="mt-2 text-xl font-bold leading-tight">
          {recommendation}
        </div>
        <Button 
          block 
          className="mt-6 !h-12 !rounded-2xl !bg-white !text-indigo-600 !font-bold !border-none active:opacity-90"
          onClick={() => router.push(`/h5/practice`)}
        >
          <div className="flex items-center justify-center gap-2">
             <PlayOutline /> 开始练习
          </div>
        </Button>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
           <h2 className="text-sm font-bold text-slate-900">学习状态</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="薄弱点" value={stats.weakPoints} unit="个" color="rose" />
          <StatCard label="本月错题" value={stats.monthWrong} unit="道" color="orange" />
          <StatCard label="练习正确率" value={stats.accuracy} unit="%" color="green" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
           <h2 className="text-sm font-bold text-slate-900">快捷入口</h2>
        </div>
        <div className="space-y-3">
          <ActionCard 
            title="上传试卷" 
            desc="AI 识别错题，自动关联知识点" 
            icon={<ScanningOutline />} 
            href={`/h5/children/${child.id}/upload`}
          />
          <ActionCard 
            title="错题库" 
            desc="查看所有记录的错题与解析" 
            icon={<FileOutline />} 
            href={`/h5/wrong-questions`}
          />
          <ActionCard 
            title="生成月度卷" 
            desc="本月错题重新练，巩固薄弱项" 
            icon={<CalendarOutline />} 
            href={`/h5/children/${child.id}/exams/monthly`}
          />
          <ActionCard 
            title="薄弱点专项" 
            desc="长期未掌握知识点强化训练" 
            icon={<PieOutline />} 
            href={`/h5/children/${child.id}/exams/weakness`}
          />
        </div>
      </section>
    </div>
  );
}
