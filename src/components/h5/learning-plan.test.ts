import { describe, expect, it } from 'vitest';
import { buildLearningPlan } from './learning-plan';

describe('buildLearningPlan', () => {
  it('tracks weekly weakness and monthly exam completion', () => {
    const now = new Date('2026-05-13T08:00:00.000Z');
    const plan = buildLearningPlan({
      childId: 'child_1',
      now,
      sessions: [
        { status: 'COMPLETED', type: 'weakness', knowledgePoint: '薄弱点专项', completedAt: '2026-05-12T08:00:00.000Z', result: { accuracy: 80 } },
        { status: 'COMPLETED', type: 'weakness', knowledgePoint: '薄弱点专项', completedAt: '2026-05-13T08:00:00.000Z', result: { accuracy: 90 } },
        { status: 'COMPLETED', type: 'monthly', knowledgePoint: '月度错题卷', completedAt: '2026-05-03T08:00:00.000Z', result: { accuracy: 88 } },
      ],
    });

    expect(plan.completionRate).toBe(100);
    expect(plan.doneCount).toBe(3);
    expect(plan.items.every((item) => item.status === 'done')).toBe(true);
  });

  it('creates reminders for due plan items and calculates improvement', () => {
    const now = new Date('2026-05-13T08:00:00.000Z');
    const plan = buildLearningPlan({
      childId: 'child_1',
      now,
      sessions: [
        { status: 'COMPLETED', completedAt: '2026-04-20T08:00:00.000Z', result: { accuracy: 60 } },
        { status: 'COMPLETED', completedAt: '2026-05-12T08:00:00.000Z', result: { accuracy: 75 } },
      ],
    });

    expect(plan.completionRate).toBe(33);
    expect(plan.improvementRate).toBe(15);
    expect(plan.reminders).toContain('本周薄弱点专项训练待完成');
    expect(plan.reminders).toContain('本月月度错题卷待完成');
  });
});
