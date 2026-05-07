import type { ReactNode } from 'react';

export type PracticeCenterAction = {
  title: string;
  href: string;
  color: 'emerald' | 'indigo' | 'rose';
  icon?: ReactNode;
};

export type PracticeKnowledgePointInput = {
  id: string;
  knowledgePointId?: string | null;
  knowledgePointText?: string | null;
  status?: string | null;
};

export type PracticeKnowledgePointOption = {
  id: string;
  title: string;
  status?: string | null;
};

export function getPracticeCenterActions(childId: string): PracticeCenterAction[] {
  return [
    { title: '知识点练习', href: `/h5/children/${childId}/practice/new`, color: 'emerald' },
    { title: '月度错题卷', href: `/h5/children/${childId}/exams/monthly`, color: 'indigo' },
    { title: '长期薄弱项', href: `/h5/children/${childId}/exams/weakness`, color: 'rose' },
  ];
}

export function normalizePracticeKnowledgePoints(points: PracticeKnowledgePointInput[]): PracticeKnowledgePointOption[] {
  const seen = new Set<string>();
  return points
    .map((point) => ({
      id: (point.knowledgePointId || point.id || '').trim(),
      title: (point.knowledgePointText || '').trim(),
      status: point.status,
    }))
    .filter((point) => {
      if (!point.id || !point.title || seen.has(point.id)) return false;
      seen.add(point.id);
      return true;
    });
}
