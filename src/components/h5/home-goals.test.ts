import { describe, expect, it } from 'vitest';
import { buildWeeklyGoal } from './home-goals';

describe('home weekly goals', () => {
  it('builds progress and ETA for weekly practice goals', () => {
    const goal = buildWeeklyGoal({
      now: new Date('2026-05-13T12:00:00.000Z'),
      sessions: [
        { status: 'COMPLETED', startedAt: '2026-05-11T10:00:00.000Z', result: { accuracy: 70 } },
        { status: 'COMPLETED', startedAt: '2026-05-12T10:00:00.000Z', result: { accuracy: 90 } },
        { status: 'COMPLETED', startedAt: '2026-05-01T10:00:00.000Z', result: { accuracy: 100 } },
      ],
    });

    expect(goal).toMatchObject({ practiceGoal: 3, practiceDone: 2, accuracyGoal: 80, currentAccuracy: 80, achieved: false });
    expect(goal.estimatedCompletion).toContain('预计 1 天完成');
  });

  it('marks the goal achieved when practice count and accuracy both pass', () => {
    const goal = buildWeeklyGoal({
      now: new Date('2026-05-13T12:00:00.000Z'),
      sessions: [1, 2, 3].map((day) => ({ status: 'COMPLETED', startedAt: `2026-05-${10 + day}T10:00:00.000Z`, result: { accuracy: 85 } })),
    });

    expect(goal.achieved).toBe(true);
    expect(goal.badge).toBe('🏅 本周目标达成');
  });
});
