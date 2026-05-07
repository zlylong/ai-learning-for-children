import { useState } from 'react';
import { Tag } from 'antd-mobile';
import { DownOutline, UpOutline } from 'antd-mobile-icons';
import { KnowledgePointTag } from './KnowledgePointTag';
import { formatWrongQuestionDate } from './wrong-questions-view-model';
import type { WrongQuestionRecord } from '@/schemas/examUploadSchema';

type WrongQuestionCardProps = {
  item?: WrongQuestionRecord;
  onPractice?: (knowledgePointId: string, title: string) => void;
  content?: string;
  analysis?: string;
  knowledgePoints?: string[];
  reason?: string;
};

export function WrongQuestionCard({ item, content, analysis, knowledgePoints = [], reason: legacyReason }: WrongQuestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const normalizedItem: WrongQuestionRecord = item ?? {
    id: content ?? 'legacy-wrong-question',
    childId: '',
    subject: '练习',
    questionText: content ?? '',
    userAnswer: '',
    correctAnswer: '',
    analysis: analysis ?? '',
    source: '',
    createdAt: new Date().toISOString(),
    knowledgePoints: knowledgePoints.map((title, index) => ({ id: `${title}-${index}`, knowledgePointId: title, title, confidence: 1 })),
  };
  const primaryPoint = normalizedItem.knowledgePoints[0];
  const reason = legacyReason || normalizedItem.analysis.split('\n').find(Boolean)?.slice(0, 36) || '查看解析了解原因';

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/[0.04]">
      <button type="button" className="block w-full p-4 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Tag color="primary" fill="outline">{normalizedItem.subject || '未分类'}</Tag>
            <span className="text-xs text-slate-400">{formatWrongQuestionDate(normalizedItem.createdAt)}</span>
          </div>
          <div className="text-slate-300">{expanded ? <UpOutline /> : <DownOutline />}</div>
        </div>

        <div className="text-sm font-medium leading-relaxed text-slate-800 line-clamp-3">{normalizedItem.questionText}</div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {normalizedItem.knowledgePoints.length > 0 ? normalizedItem.knowledgePoints.map((kp) => <KnowledgePointTag key={kp.knowledgePointId} name={kp.title} />) : <KnowledgePointTag name="待确认知识点" />}
        </div>

        <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-600">
          错误原因：{reason}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-50 bg-slate-50/60 p-4 text-sm">
          <div className="grid grid-cols-1 gap-2">
            <div className="rounded-2xl bg-white p-3">
              <div className="mb-1 text-xs font-bold text-slate-400">我的答案</div>
              <div className="text-rose-600">{normalizedItem.userAnswer || '未识别'}</div>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <div className="mb-1 text-xs font-bold text-slate-400">正确答案</div>
              <div className="text-emerald-600">{normalizedItem.correctAnswer || '待补充'}</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3">
            <div className="mb-1 text-xs font-bold text-slate-400">解析</div>
            <div className="whitespace-pre-wrap leading-relaxed text-slate-600">{normalizedItem.analysis || '暂无解析'}</div>
          </div>

          <div className="flex gap-2">
            {primaryPoint && normalizedItem.childId && (
              <a
                className="block w-full rounded-xl border border-blue-500 px-3 py-2 text-center text-sm font-medium text-blue-600 active:opacity-80"
                href={`/h5/children/${normalizedItem.childId}/practice/new?knowledgePointId=${encodeURIComponent(primaryPoint.knowledgePointId)}&knowledgePoint=${encodeURIComponent(primaryPoint.title)}`}
              >
                练这个知识点
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
