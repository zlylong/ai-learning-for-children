import { describe, expect, it } from 'vitest';
import { buildWeaknessPracticePayload, selectWeaknessFocusPoints } from './weakness-training-actions';

describe('weakness training actions', () => {
  it('selects weak and practicing points before mastered points by severity', () => {
    const selected = selectWeaknessFocusPoints([
      { id: 'm', knowledgePointId: 'kp-m', knowledgePointText: '已掌握', status: 'MASTERED', wrongCount: 99, masteryScore: 95 },
      { id: 'p', knowledgePointId: 'kp-p', knowledgePointText: '练习中', status: 'PRACTICING', wrongCount: 8, masteryScore: 55 },
      { id: 'w2', knowledgePointId: 'kp-w2', knowledgePointText: '薄弱 B', status: 'WEAK', wrongCount: 3, masteryScore: 20 },
      { id: 'w1', knowledgePointId: 'kp-w1', knowledgePointText: '薄弱 A', status: 'WEAK', wrongCount: 7, masteryScore: 10 },
    ]);
    expect(selected.map((point) => point.id)).toEqual(['kp-w1', 'kp-w2', 'kp-p']);
  });

  it('builds a practice-generation request for the focused weak point', () => {
    expect(buildWeaknessPracticePayload('child-1', { id: 'kp-w1', title: '薄弱 A', status: 'WEAK', wrongCount: 7 })).toEqual({
      childId: 'child-1',
      knowledgePointId: 'kp-w1',
      knowledgePoint: '薄弱 A',
      questionCount: 8,
      difficulty: 'medium',
      questionType: 'single_choice',
    });
  });
});
