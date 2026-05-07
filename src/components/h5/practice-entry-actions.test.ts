import { describe, expect, it } from 'vitest';
import { getPracticeCenterActions, normalizePracticeKnowledgePoints } from './practice-entry-actions';

describe('practice entry integration', () => {
  it('exposes knowledge-point practice as a first-class practice-center action', () => {
    expect(getPracticeCenterActions('child-1')).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '知识点练习', href: '/h5/children/child-1/practice/new' }),
    ]));
  });

  it('uses real child knowledge points before static fallback for new practice', () => {
    const points = normalizePracticeKnowledgePoints([
      { id: 'row-1', knowledgePointId: 'kp-real-1', knowledgePointText: '实际薄弱点 A', status: 'WEAK' },
      { id: 'row-2', knowledgePointId: 'kp-real-2', knowledgePointText: '实际薄弱点 B', status: 'MASTERED' },
    ]);
    expect(points).toEqual([
      { id: 'kp-real-1', title: '实际薄弱点 A', status: 'WEAK' },
      { id: 'kp-real-2', title: '实际薄弱点 B', status: 'MASTERED' },
    ]);
  });
});
