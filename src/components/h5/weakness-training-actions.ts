import type { PracticeDifficulty, PracticeQuestionType } from '@/features/practice/schema';

export type WeaknessPointInput = {
  id: string;
  knowledgePointId?: string | null;
  knowledgePointText?: string | null;
  status?: string | null;
  wrongCount?: number | null;
  practiceCount?: number | null;
  correctCount?: number | null;
  masteryScore?: number | null;
  lastPracticedAt?: string | null;
  updatedAt?: string | null;
};

export type WeaknessFocusPoint = {
  id: string;
  title: string;
  status: 'WEAK' | 'PRACTICING' | 'MASTERED' | 'UNKNOWN' | string;
  wrongCount: number;
  practiceCount: number;
  correctCount: number;
  masteryScore: number;
  lastPracticedAt: string | null;
};

const statusPriority: Record<string, number> = {
  WEAK: 0,
  PRACTICING: 1,
  UNKNOWN: 2,
  MASTERED: 3,
};

export function selectWeaknessFocusPoints(points: WeaknessPointInput[], limit = 5): WeaknessFocusPoint[] {
  return points
    .map((point): WeaknessFocusPoint => ({
      id: (point.knowledgePointId || point.id || '').trim(),
      title: (point.knowledgePointText || '').trim(),
      status: point.status || 'UNKNOWN',
      wrongCount: point.wrongCount ?? 0,
      practiceCount: point.practiceCount ?? 0,
      correctCount: point.correctCount ?? 0,
      masteryScore: point.masteryScore ?? 0,
      lastPracticedAt: point.lastPracticedAt || point.updatedAt || null,
    }))
    .filter((point) => point.id && point.title)
    .filter((point) => point.status === 'WEAK' || point.status === 'PRACTICING' || (point.status !== 'MASTERED' && point.wrongCount > 0))
    .sort((a, b) => {
      const byStatus = (statusPriority[a.status] ?? 2) - (statusPriority[b.status] ?? 2);
      if (byStatus !== 0) return byStatus;
      if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
      if (a.masteryScore !== b.masteryScore) return a.masteryScore - b.masteryScore;
      return a.title.localeCompare(b.title, 'zh-Hans-CN');
    })
    .slice(0, limit);
}

export function buildWeaknessPracticePayload(
  childId: string,
  point: Pick<WeaknessFocusPoint, 'id' | 'title' | 'status' | 'wrongCount'>,
  options?: { questionCount?: number; difficulty?: PracticeDifficulty; questionType?: PracticeQuestionType },
) {
  return {
    childId,
    knowledgePointId: point.id,
    knowledgePoint: point.title,
    questionCount: options?.questionCount ?? 8,
    difficulty: options?.difficulty ?? 'medium',
    questionType: options?.questionType ?? 'single_choice',
  };
}
