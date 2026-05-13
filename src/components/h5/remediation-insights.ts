import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';
import type { PracticeSessionRecord } from '@/features/practice/schema';

export type RewrongWarning = {
  knowledgePointId?: string;
  knowledgePoint: string;
  wrongCount: number;
  recentWrongAt: string | null;
  message: string;
};

function kpKey(id: string | null | undefined, title: string) {
  return id?.trim() || title.trim();
}

export function buildRewrongWarnings(wrongQuestions: WrongQuestionRecord[], threshold = 2): RewrongWarning[] {
  const stats = new Map<string, { id?: string; title: string; count: number; recentWrongAt: string | null }>();
  for (const item of wrongQuestions) {
    for (const point of item.knowledgePoints) {
      const key = kpKey(point.knowledgePointId, point.title);
      if (!key) continue;
      const existing = stats.get(key) ?? { id: point.knowledgePointId, title: point.title, count: 0, recentWrongAt: null };
      existing.count += 1;
      if (!existing.recentWrongAt || item.createdAt > existing.recentWrongAt) existing.recentWrongAt = item.createdAt;
      stats.set(key, existing);
    }
  }

  return Array.from(stats.values())
    .filter((item) => item.count >= threshold)
    .sort((a, b) => b.count - a.count || String(b.recentWrongAt).localeCompare(String(a.recentWrongAt)))
    .map((item) => ({
      knowledgePointId: item.id,
      knowledgePoint: item.title,
      wrongCount: item.count,
      recentWrongAt: item.recentWrongAt,
      message: `这个知识点已连续/累计错 ${item.count} 次，建议先看讲解，再用低难度找回正确思路。`,
    }));
}

function titlesEquivalent(a: string, b: string) {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  return left.includes('进位') && right.includes('进位') && left.includes('加') && right.includes('加');
}

export function findWarningForPoint(warnings: RewrongWarning[], point: { knowledgePointId?: string | null; knowledgePointText?: string; knowledgePoint?: string }) {
  const title = point.knowledgePointText ?? point.knowledgePoint ?? '';
  return warnings.find((warning) => {
    if (warning.knowledgePointId && point.knowledgePointId && warning.knowledgePointId === point.knowledgePointId) return true;
    return titlesEquivalent(warning.knowledgePoint, title);
  }) ?? null;
}

export type RemediationResult = {
  wasRewrongPoint: boolean;
  solved: boolean | null;
  title: string;
  message: string;
};

export function buildRemediationResult(session: PracticeSessionRecord, warnings: RewrongWarning[]): RemediationResult {
  const relatedWarnings = warnings.filter((warning) => {
    if (findWarningForPoint([warning], { knowledgePoint: session.knowledgePoint })) return true;
    return session.questions.some((question) => findWarningForPoint([warning], { knowledgePointId: question.knowledgePointId, knowledgePoint: question.knowledgePoint }));
  });
  if (relatedWarnings.length === 0) {
    return {
      wasRewrongPoint: false,
      solved: null,
      title: '本次练习反馈',
      message: '本次不是历史高频再错知识点，可继续保持练习节奏。',
    };
  }

  const stillWrong = session.questions.some((question) => {
    return question.isCorrect === false && relatedWarnings.some((warning) => findWarningForPoint([warning], { knowledgePointId: question.knowledgePointId, knowledgePoint: question.knowledgePoint }));
  });

  return {
    wasRewrongPoint: true,
    solved: !stillWrong,
    title: !stillWrong ? '历史错因已初步解决' : '历史错因还需要再拆解',
    message: !stillWrong
      ? '这次没有在高频错点上再错，说明讲解后的订正思路正在生效。'
      : '这次仍命中了历史错因，建议回到讲解弹层，先做例题再进行轻量练习。',
  };
}
