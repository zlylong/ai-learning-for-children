import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';

type PracticeSubject = 'chinese' | 'math' | 'english';

type SessionForRecommendation = {
  status: string;
  subject?: string | null;
  knowledgePoint?: string | null;
  startedAt?: string | null;
  result?: { accuracy?: number | null } | null;
};

export type ExplainableRecommendation = {
  knowledgePoint: string;
  subject: PracticeSubject | null;
  reason: string;
  score: number;
  metrics: {
    wrongCount: number;
    recentWrongCount: number;
    daysSincePractice: number | null;
    recentAccuracy: number | null;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(now: Date, value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / DAY_MS));
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizeSubject(value?: string | null): PracticeSubject | null {
  if (value === 'chinese' || value === '语文') return 'chinese';
  if (value === 'math' || value === '数学') return 'math';
  if (value === 'english' || value === '英语') return 'english';
  return null;
}

export function buildExplainableRecommendations(input: {
  wrongQuestions: WrongQuestionRecord[];
  sessions: SessionForRecommendation[];
  now?: Date;
}): ExplainableRecommendation[] {
  const now = input.now ?? new Date();
  const sevenDaysAgo = now.getTime() - 7 * DAY_MS;
  const candidates = new Map<string, {
    subject: PracticeSubject | null;
    wrongCount: number;
    recentWrongCount: number;
    practiceDates: string[];
    accuracies: Array<{ startedAt: string; accuracy: number }>;
  }>();

  const ensure = (title: string, subject?: string | null) => {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const current = candidates.get(trimmed) ?? {
      subject: normalizeSubject(subject),
      wrongCount: 0,
      recentWrongCount: 0,
      practiceDates: [],
      accuracies: [],
    };
    current.subject ??= normalizeSubject(subject);
    candidates.set(trimmed, current);
    return current;
  };

  input.wrongQuestions.forEach((question) => {
    const createdAt = new Date(question.createdAt).getTime();
    question.knowledgePoints.forEach((point) => {
      const candidate = ensure(point.title, question.subject);
      if (!candidate) return;
      candidate.wrongCount += 1;
      if (!Number.isNaN(createdAt) && createdAt >= sevenDaysAgo) candidate.recentWrongCount += 1;
    });
  });

  input.sessions.forEach((session) => {
    const candidate = ensure(session.knowledgePoint ?? '', session.subject);
    if (!candidate) return;
    if (session.startedAt) candidate.practiceDates.push(session.startedAt);
    const accuracy = session.result?.accuracy;
    if (session.status === 'COMPLETED' && typeof accuracy === 'number') {
      candidate.accuracies.push({ startedAt: session.startedAt ?? '', accuracy });
    }
  });

  return Array.from(candidates.entries()).map(([knowledgePoint, metrics]) => {
    const lastPracticedAt = metrics.practiceDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    const daysSincePractice = daysBetween(now, lastPracticedAt);
    const recentAccuracies = metrics.accuracies
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
      .slice(-3)
      .map((item) => item.accuracy);
    const recentAccuracy = average(recentAccuracies);
    const accuracyDrop = recentAccuracies.length >= 3 && recentAccuracies[2] < recentAccuracies[1] && recentAccuracies[1] <= recentAccuracies[0];
    const staleBonus = daysSincePractice === null ? 35 : daysSincePractice >= 7 ? 28 : Math.max(0, daysSincePractice * 3);
    const accuracyPenalty = recentAccuracy === null ? 10 : Math.max(0, 80 - recentAccuracy);
    const score = metrics.wrongCount * 16 + metrics.recentWrongCount * 18 + staleBonus + accuracyPenalty + (accuracyDrop ? 20 : 0);

    let reason = '综合错题、练习间隔和正确率，今天优先巩固';
    if (metrics.recentWrongCount > 0 && metrics.recentWrongCount >= Math.max(1, metrics.wrongCount / 2)) {
      reason = '近7天错题最多，建议趁热订正';
    } else if (daysSincePractice === null || daysSincePractice >= 7) {
      reason = '本周未练习，适合先做一轮巩固';
    } else if (accuracyDrop) {
      reason = '近3次正确率下降，需要及时稳住';
    } else if (recentAccuracy !== null && recentAccuracy < 60) {
      reason = '近3次正确率偏低，需要补基础';
    }

    return {
      knowledgePoint,
      subject: metrics.subject,
      reason,
      score,
      metrics: {
        wrongCount: metrics.wrongCount,
        recentWrongCount: metrics.recentWrongCount,
        daysSincePractice,
        recentAccuracy,
      },
    };
  }).sort((a, b) => b.score - a.score || a.knowledgePoint.localeCompare(b.knowledgePoint, 'zh-CN'));
}
