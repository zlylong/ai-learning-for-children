import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';

type PracticeSessionSummary = {
  status: string;
  type?: string | null;
  knowledgePoint?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  result?: { accuracy?: number | null } | null;
};

export type LearningPlanItemKind = 'weakness' | 'monthly';
export type LearningPlanItemStatus = 'due' | 'upcoming' | 'done';

export type LearningPlanItem = {
  id: string;
  kind: LearningPlanItemKind;
  title: string;
  cadence: string;
  status: LearningPlanItemStatus;
  completed: number;
  target: number;
  nextDueText: string;
  href: string;
  reminder: string;
};

export type LearningPlanViewModel = {
  completionRate: number;
  improvementRate: number;
  doneCount: number;
  targetCount: number;
  reminders: string[];
  items: LearningPlanItem[];
};

function startOfWeek(date = new Date()) {
  const day = date.getDay() || 7;
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function asDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCompleted(session: PracticeSessionSummary) {
  return session.status === 'COMPLETED' || session.status === 'DONE';
}

function inRange(date: Date | null, start: Date, end = new Date()) {
  return Boolean(date && date >= start && date <= end);
}

function calcImprovementRate(sessions: PracticeSessionSummary[], now = new Date()) {
  const completed = sessions
    .filter(isCompleted)
    .map((session) => ({ date: asDate(session.completedAt ?? session.startedAt), accuracy: session.result?.accuracy }))
    .filter((item): item is { date: Date; accuracy: number } => Boolean(item.date) && typeof item.accuracy === 'number')
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  if (completed.length < 2) return 0;

  const monthStart = startOfMonth(now);
  const thisMonth = completed.filter((item) => item.date >= monthStart);
  const beforeMonth = completed.filter((item) => item.date < monthStart);
  if (thisMonth.length === 0) return 0;

  const currentAvg = thisMonth.reduce((sum, item) => sum + item.accuracy, 0) / thisMonth.length;
  const baselineSource = beforeMonth.length > 0 ? beforeMonth.slice(-5) : completed.slice(0, Math.max(1, completed.length - thisMonth.length));
  if (baselineSource.length === 0) return Math.max(0, Math.round(currentAvg));
  const baselineAvg = baselineSource.reduce((sum, item) => sum + item.accuracy, 0) / baselineSource.length;
  return Math.max(0, Math.round(currentAvg - baselineAvg));
}

export function buildLearningPlan(input: {
  childId: string;
  sessions: PracticeSessionSummary[];
  wrongQuestions?: WrongQuestionRecord[];
  now?: Date;
}): LearningPlanViewModel {
  const now = input.now ?? new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const completed = input.sessions.filter(isCompleted);
  const thisWeek = completed.filter((session) => inRange(asDate(session.completedAt ?? session.startedAt), weekStart, now));
  const thisMonth = completed.filter((session) => inRange(asDate(session.completedAt ?? session.startedAt), monthStart, now));

  const weeklyWeaknessDone = thisWeek.filter((session) => {
    const type = `${session.type ?? ''}`.toLowerCase();
    const kp = `${session.knowledgePoint ?? ''}`;
    return type.includes('weak') || kp.includes('薄弱') || kp.includes('专项');
  }).length;
  const weeklyWeaknessFallback = Math.min(2, thisWeek.length);
  const weaknessCompleted = Math.max(weeklyWeaknessDone, weeklyWeaknessFallback);
  const monthlyCompleted = thisMonth.some((session) => `${session.type ?? ''}`.toLowerCase().includes('monthly') || `${session.knowledgePoint ?? ''}`.includes('月度')) ? 1 : 0;

  const items: LearningPlanItem[] = [
    {
      id: 'weekly-weakness',
      kind: 'weakness',
      title: '每周薄弱点专项',
      cadence: '每周 2 次',
      status: weaknessCompleted >= 2 ? 'done' : 'due',
      completed: Math.min(2, weaknessCompleted),
      target: 2,
      nextDueText: weaknessCompleted >= 2 ? '本周已完成' : `本周还需 ${2 - weaknessCompleted} 次`,
      href: `/h5/children/${input.childId}/exams/weakness`,
      reminder: weaknessCompleted >= 2 ? '本周专项训练已达标' : '本周薄弱点专项训练待完成',
    },
    {
      id: 'monthly-exam',
      kind: 'monthly',
      title: '月度错题卷',
      cadence: '每月 1 次',
      status: monthlyCompleted ? 'done' : 'upcoming',
      completed: monthlyCompleted,
      target: 1,
      nextDueText: monthlyCompleted ? '本月已完成' : '本月建议完成 1 次',
      href: `/h5/children/${input.childId}/exams/monthly`,
      reminder: monthlyCompleted ? '本月月度卷已完成' : '本月月度错题卷待完成',
    },
  ];

  const doneCount = items.reduce((sum, item) => sum + item.completed, 0);
  const targetCount = items.reduce((sum, item) => sum + item.target, 0);
  const completionRate = targetCount > 0 ? Math.round((doneCount / targetCount) * 100) : 0;
  const improvementRate = calcImprovementRate(input.sessions, now);
  const wrongCount = input.wrongQuestions?.length ?? 0;
  const reminders = items
    .filter((item) => item.status !== 'done')
    .map((item) => item.reminder)
    .concat(wrongCount >= 5 ? [`本月已有 ${wrongCount} 道错题，建议优先安排专项训练`] : [])
    .slice(0, 3);

  return { completionRate, improvementRate, doneCount, targetCount, reminders, items };
}
