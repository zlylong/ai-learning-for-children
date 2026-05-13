import { describe, expect, it } from 'vitest';
import { buildRemediationResult, buildRewrongWarnings, findWarningForPoint } from './remediation-insights';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';
import type { PracticeSessionRecord } from '@/features/practice/schema';

const wrong = (id: string, kpId: string, title: string, createdAt: string): WrongQuestionRecord => ({
  id,
  childId: 'child-1',
  subject: 'math',
  questionText: '1+1=?',
  userAnswer: '3',
  correctAnswer: '2',
  analysis: '进位理解错误',
  source: 'upload',
  createdAt,
  knowledgePoints: [{ id: `${id}-kp`, knowledgePointId: kpId, title, confidence: 0.9 }],
});

describe('remediation insights', () => {
  it('flags knowledge points with repeated wrong questions', () => {
    const warnings = buildRewrongWarnings([
      wrong('w1', 'kp-1', '两位数加法进位', '2026-05-10T10:00:00.000Z'),
      wrong('w2', 'kp-1', '两位数加法进位', '2026-05-11T10:00:00.000Z'),
      wrong('w3', 'kp-2', '阅读概括', '2026-05-12T10:00:00.000Z'),
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ knowledgePointId: 'kp-1', wrongCount: 2 });
    expect(findWarningForPoint(warnings, { knowledgePointId: 'kp-1', knowledgePointText: '两位数加法进位' })?.message).toContain('先看讲解');
    expect(findWarningForPoint(warnings, { knowledgePointId: 'catalog-id', knowledgePointText: '两位数加两位数进位' })?.wrongCount).toBe(2);
  });

  it('judges whether a repeated wrong cause was solved in result', () => {
    const warnings = buildRewrongWarnings([
      wrong('w1', 'kp-1', '两位数加法进位', '2026-05-10T10:00:00.000Z'),
      wrong('w2', 'kp-1', '两位数加法进位', '2026-05-11T10:00:00.000Z'),
    ]);
    const session = {
      id: 's1', childId: 'child-1', title: '', status: 'COMPLETED', knowledgePoint: '两位数加两位数进位', questionCount: 1,
      difficulty: 'easy', questionType: 'single_choice', startedAt: '2026-05-13T10:00:00.000Z', endedAt: '2026-05-13T10:05:00.000Z',
      result: { correctCount: 1, totalCount: 1, accuracy: 100, masteryBefore: 'WEAK', masteryAfter: 'WEAK' },
      questions: [{ id: 'q1', sessionId: 's1', order: 1, stem: '', questionText: '', questionType: 'single_choice', options: [], answerText: '2', answer: '2', analysis: '', explanation: '', knowledgePoint: '两位数加法进位', knowledgePointId: 'kp-1', userAnswer: '2', isCorrect: true }],
    } satisfies PracticeSessionRecord;

    expect(buildRemediationResult(session, warnings)).toMatchObject({ wasRewrongPoint: true, solved: true });
  });
});
