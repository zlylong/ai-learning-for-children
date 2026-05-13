type SessionForGoal = {
  status: string;
  startedAt?: string | null;
  result?: { accuracy?: number | null } | null;
};

export type WeeklyGoalViewModel = {
  practiceGoal: number;
  practiceDone: number;
  accuracyGoal: number;
  currentAccuracy: number;
  progressPercent: number;
  estimatedCompletion: string;
  achieved: boolean;
  badge: string;
  message: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

export function buildWeeklyGoal(input: { sessions: SessionForGoal[]; now?: Date; practiceGoal?: number; accuracyGoal?: number }): WeeklyGoalViewModel {
  const now = input.now ?? new Date();
  const weekStart = startOfWeek(now).getTime();
  const practiceGoal = input.practiceGoal ?? 3;
  const accuracyGoal = input.accuracyGoal ?? 80;
  const weeklyCompleted = input.sessions.filter((session) => {
    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : 0;
    return session.status === 'COMPLETED' && startedAt >= weekStart && startedAt <= now.getTime();
  });
  const practiceDone = weeklyCompleted.length;
  const currentAccuracy = weeklyCompleted.length > 0
    ? Math.round(weeklyCompleted.reduce((sum, session) => sum + (session.result?.accuracy ?? 0), 0) / weeklyCompleted.length)
    : 0;
  const practiceProgress = Math.min(1, practiceDone / practiceGoal);
  const accuracyProgress = Math.min(1, currentAccuracy / accuracyGoal);
  const progressPercent = Math.round(((practiceProgress + accuracyProgress) / 2) * 100);
  const achieved = practiceDone >= practiceGoal && currentAccuracy >= accuracyGoal;
  const remainingPractice = Math.max(0, practiceGoal - practiceDone);
  const daysLeft = Math.max(0, 7 - Math.floor((now.getTime() - weekStart) / DAY_MS));

  let estimatedCompletion = achieved ? '已达成本周目标' : `还差 ${remainingPractice} 次练习`;
  if (!achieved && remainingPractice > 0) {
    estimatedCompletion = daysLeft <= 1 ? `今天完成 ${remainingPractice} 次可冲刺达标` : `按每天 1 次，预计 ${remainingPractice} 天完成`;
  } else if (!achieved && currentAccuracy < accuracyGoal) {
    estimatedCompletion = `正确率还差 ${accuracyGoal - currentAccuracy} 个百分点`;
  }

  return {
    practiceGoal,
    practiceDone,
    accuracyGoal,
    currentAccuracy,
    progressPercent,
    estimatedCompletion,
    achieved,
    badge: achieved ? '🏅 本周目标达成' : '🎯 本周目标进行中',
    message: achieved ? '太棒了！可以分享这次坚持成果。' : `完成 ${practiceGoal} 次练习，并把正确率提升到 ${accuracyGoal}%。`,
  };
}
