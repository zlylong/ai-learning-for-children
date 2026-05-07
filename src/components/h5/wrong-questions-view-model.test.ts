import { describe, expect, it } from 'vitest';
import { buildWrongQuestionViewModel, filterWrongQuestions } from './wrong-questions-view-model';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';

const base: WrongQuestionRecord[] = [
  {
    id: 'w1', childId: 'c1', subject: '数学', questionText: '计算 12+9', userAnswer: '20', correctAnswer: '21',
    analysis: '进位加法没有处理个位进位', source: 'upload-a', createdAt: '2026-05-01T08:00:00.000Z',
    knowledgePoints: [{ id: 'l1', knowledgePointId: 'kp-add', title: '两位数加法进位', confidence: 0.9 }],
  },
  {
    id: 'w2', childId: 'c1', subject: '语文', questionText: '概括短文主要内容', userAnswer: '写景', correctAnswer: '人物成长',
    analysis: '没有抓住中心事件', source: 'upload-b', createdAt: '2026-05-02T08:00:00.000Z',
    knowledgePoints: [{ id: 'l2', knowledgePointId: 'kp-read', title: '阅读理解-内容概括', confidence: 0.8 }],
  },
  {
    id: 'w3', childId: 'c1', subject: '数学', questionText: '计算 23+8', userAnswer: '30', correctAnswer: '31',
    analysis: '仍然漏掉进位', source: 'upload-c', createdAt: '2026-05-03T08:00:00.000Z',
    knowledgePoints: [{ id: 'l3', knowledgePointId: 'kp-add', title: '两位数加法进位', confidence: 0.95 }],
  },
];

describe('wrong questions view model', () => {
  it('builds summary metrics and high-frequency knowledge points', () => {
    const model = buildWrongQuestionViewModel(base);
    expect(model.totalCount).toBe(3);
    expect(model.subjectOptions.map((item) => item.value)).toEqual(['all', '数学', '语文']);
    expect(model.knowledgePointOptions.map((item) => item.value)).toEqual(['all', 'kp-add', 'kp-read']);
    expect(model.topKnowledgePoints[0]).toMatchObject({ id: 'kp-add', title: '两位数加法进位', count: 2 });
  });

  it('filters by subject, knowledge point and search keyword together', () => {
    const filtered = filterWrongQuestions(base, { subject: '数学', knowledgePointId: 'kp-add', keyword: '23+8' });
    expect(filtered.map((item) => item.id)).toEqual(['w3']);
  });
});
