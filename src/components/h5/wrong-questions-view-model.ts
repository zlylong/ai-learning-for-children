import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';

export type WrongQuestionFilters = {
  subject: string;
  knowledgePointId: string;
  keyword: string;
};

export type FilterOption = { label: string; value: string };
export type TopKnowledgePoint = { id: string; title: string; count: number };

function uniqueOptions(values: string[]): FilterOption[] {
  return Array.from(new Set(values.filter(Boolean))).map((value) => ({ label: value, value }));
}

export function buildWrongQuestionViewModel(items: WrongQuestionRecord[]) {
  const kpCounts = new Map<string, TopKnowledgePoint>();
  for (const item of items) {
    for (const point of item.knowledgePoints) {
      const existing = kpCounts.get(point.knowledgePointId) ?? { id: point.knowledgePointId, title: point.title, count: 0 };
      existing.count += 1;
      kpCounts.set(point.knowledgePointId, existing);
    }
  }

  const topKnowledgePoints = Array.from(kpCounts.values())
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh-Hans-CN'));

  return {
    totalCount: items.length,
    subjectOptions: [{ label: '全部', value: 'all' }, ...uniqueOptions(items.map((item) => item.subject))],
    knowledgePointOptions: [{ label: '全部知识点', value: 'all' }, ...topKnowledgePoints.map((point) => ({ label: `${point.title}(${point.count})`, value: point.id }))],
    topKnowledgePoints: topKnowledgePoints.slice(0, 5),
    latestAt: items[0]?.createdAt ?? null,
  };
}

export function filterWrongQuestions(items: WrongQuestionRecord[], filters: WrongQuestionFilters) {
  const keyword = filters.keyword.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.subject !== 'all' && item.subject !== filters.subject) return false;
    if (filters.knowledgePointId !== 'all' && !item.knowledgePoints.some((point) => point.knowledgePointId === filters.knowledgePointId)) return false;
    if (!keyword) return true;
    const searchable = [
      item.questionText,
      item.userAnswer,
      item.correctAnswer,
      item.analysis,
      item.subject,
      ...item.knowledgePoints.map((point) => point.title),
    ].join('\n').toLowerCase();
    return searchable.includes(keyword);
  });
}

export function formatWrongQuestionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}
