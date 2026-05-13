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
import { buildExplainableRecommendations, type ExplainableRecommendation } from './home-recommendations';
import { buildWeeklyGoal, type WeeklyGoalViewModel } from './home-goals';
import { ChildSwitcher } from './ChildSwitcher';
import { StatCard } from './StatCard';
import { ActionCard } from './ActionCard';
import { EmptyState } from './EmptyState';

type PracticeSessionSummary = {
  status: string;
  subject?: string | null;
  knowledgePoint?: string | null;
  startedAt?: string | null;
  result?: { accuracy?: number } | null;
};

export function HomeClient() {
  const router = useRouter();
  const [childId, setChildId] = useState<string | null>(null);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [stats, setStats] = useState({
    weakPoints: 0,
    monthWrong: 0,
    accuracy: 0,
  });
  const [recommendations, setRecommendations] = useState<ExplainableRecommendation[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalViewModel | null>(null);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const childRes = await fetch('/api/children', { cache: 'no-store' });
      const childData = (await childRes.json()) as { children: ChildProfile[] };
      const currentChild = childData.children.find((c) => c.id === id);
      
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
      const practiceData = (await practiceRes.json()) as { sessions?: PracticeSessionSummary[] };
      const sessions = practiceData.sessions || [];
      const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
      const avgAccuracy = completedSessions.length > 0 
        ? Math.round(completedSessions.reduce((acc: number, s) => acc + (s.result?.accuracy || 0), 0) / completedSessions.length)
        : 0;

      setStats({
        weakPoints: weakKpSet.size,
        monthWrong: thisMonth.length,
        accuracy: avgAccuracy,
      });

      setRecommendations(buildExplainableRecommendations({ wrongQuestions: questions, sessions }));
      setWeeklyGoal(buildWeeklyGoal({ sessions }));
      setRecommendationIndex(0);

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

  const recommendation = recommendations[recommendationIndex % Math.max(1, recommendations.length)] ?? null;

  return (
    <div className="space-y-6 pb-10">
      <ChildSwitcher name={child.name} grade={child.grade} id={child.id} />

      <section className="rounded-[32px] bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white shadow-lg shadow-indigo-200">
        <div className="flex items-center gap-2 text-indigo-100 opacity-80">
          <StarOutline fontSize={16} />
          <span className="text-xs font-bold uppercase tracking-wider">今日建议</span>
        </div>
        <div className="mt-2 text-xl font-bold leading-tight">
          {recommendation ? `建议今天练习：${recommendation.knowledgePoint}` : '暂无推荐练习，建议上传试卷分析'}
        </div>
        {recommendation ? (
          <div className="mt-3 rounded-2xl bg-white/10 p-3 text-xs leading-5 text-indigo-50">
            <div className="font-semibold">推荐原因：{recommendation.reason}</div>
            <div className="mt-1 opacity-85">
              错题 {recommendation.metrics.wrongCount} 次
              {recommendation.metrics.recentWrongCount > 0 ? ` · 近7天 ${recommendation.metrics.recentWrongCount} 次` : ''}
              {recommendation.metrics.daysSincePractice === null ? ' · 尚未练习' : ` · 距上次练习 ${recommendation.metrics.daysSincePractice} 天`}
              {recommendation.metrics.recentAccuracy !== null ? ` · 近3次正确率 ${recommendation.metrics.recentAccuracy}%` : ''}
            </div>
          </div>
        ) : null}
        {recommendations.length > 1 ? (
          <button
            type="button"
            className="mt-4 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white active:bg-white/20"
            onClick={() => setRecommendationIndex((index) => (index + 1) % recommendations.length)}
          >
            换一个推荐
          </button>
        ) : null}
        <Button 
          block 
          className="mt-6 !h-12 !rounded-2xl !bg-white !text-indigo-600 !font-bold !border-none active:opacity-90"
          onClick={() => {
            const params = new URLSearchParams({ childId: child.id });
            if (recommendation) {
              params.set('knowledgePoint', recommendation.knowledgePoint);
              if (recommendation.subject) params.set('subject', recommendation.subject);
            }
            router.push(`/h5/practice?${params.toString()}`);
          }}
        >
          <div className="flex items-center justify-center gap-2">
             <PlayOutline /> 开始练习
          </div>
        </Button>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
           <h2 className="text-sm font-bold text-slate-900">本周目标</h2>
           {weeklyGoal?.achieved ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600">可分享</span> : null}
        </div>
        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">{weeklyGoal?.badge ?? '🎯 本周目标'}</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {weeklyGoal?.message ?? '完成 3 次练习，并把正确率提升到 80%。'}
              </p>
            </div>
            <div className="rounded-2xl bg-indigo-50 px-3 py-2 text-center text-indigo-600">
              <div className="text-xl font-black">{weeklyGoal?.progressPercent ?? 0}%</div>
              <div className="text-[10px] font-bold">进度</div>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all" style={{ width: `${weeklyGoal?.progressPercent ?? 0}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="font-bold text-slate-900">练习 {weeklyGoal?.practiceDone ?? 0}/{weeklyGoal?.practiceGoal ?? 3} 次</div>
              <div className="mt-1 text-slate-400">本周完成次数</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="font-bold text-slate-900">{weeklyGoal?.currentAccuracy ?? 0}%/{weeklyGoal?.accuracyGoal ?? 80}%</div>
              <div className="mt-1 text-slate-400">本周正确率目标</div>
            </div>
          </div>
          <div className={`mt-3 rounded-2xl p-3 text-xs leading-5 ${weeklyGoal?.achieved ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
            {weeklyGoal?.achieved ? '🎉 目标已达成：你已经获得“本周坚持徽章”，可以把好消息分享给家人。' : `预计完成时间：${weeklyGoal?.estimatedCompletion ?? '按每天 1 次，预计 3 天完成'}`}
          </div>
        </div>
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
