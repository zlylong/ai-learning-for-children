import { describe, expect, it } from 'vitest';
import { getPracticeCenterActions, normalizePracticeKnowledgePoints } from './practice-entry-actions';

describe('practice entry integration', () => {
  it('exposes knowledge-point practice as a first-class practice-center action', () => {
    expect(getPracticeCenterActions('child-1')).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '知识点练习', href: '/h5/practice?childId=child-1' }),
    ]));
  });

  it('uses real child knowledge points before static fallback for new practice', () => {
    const points = normalizePracticeKnowledgePoints([
      { id: 'row-1', knowledgePointId: 'kp-real-1', knowledgePointText: '实际薄弱点 A', status: 'WEAK' },
      { id: 'row-2', knowledgePointId: 'kp-real-2', knowledgePointText: '实际薄弱点 B', status: 'MASTERED' },
    ]);
    expect(points).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'kp-real-1', title: '实际薄弱点 A', status: 'WEAK' }),
      expect.objectContaining({ id: 'kp-real-2', title: '实际薄弱点 B', status: 'MASTERED' }),
    ]));
  });

  it('preserves knowledge-point explanation and examples for the H5 preview card', () => {
    const points = normalizePracticeKnowledgePoints([{
      id: 'row-1',
      knowledgePointId: 'kp-catalog-1',
      knowledgePointText: '万以内数的认识',
      status: 'UNKNOWN',
      explanation: { why: '承接数感。', howToLearn: '先读写再比较。', steps: ['读数', '写数'] },
      examples: [{ question: '3005 怎么读？', answer: '三千零五。', analysis: '中间连续的 0 只读一个零。' }],
      keyConcepts: ['读数', '写数'],
    }]);
    expect(points[0]).toMatchObject({
      id: 'kp-catalog-1',
      explanation: expect.objectContaining({ why: '承接数感。' }),
      examples: expect.arrayContaining([expect.objectContaining({ question: '3005 怎么读？' })]),
      keyConcepts: ['读数', '写数'],
    });
  });
});
