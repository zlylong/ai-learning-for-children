
import { useState } from 'react';
import { DownOutline, UpOutline } from 'antd-mobile-icons';
import { KnowledgePointTag } from './KnowledgePointTag';
import { Button } from 'antd-mobile';

export function WrongQuestionCard({ content, analysis, knowledgePoints, reason, onPractice }: { 
  content: string; 
  analysis: string; 
  knowledgePoints: string[]; 
  reason: string;
  onPractice?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
      <div className="p-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm text-slate-700 line-clamp-2 flex-1">
            {content}
          </div>
          <div className="text-slate-300 mt-1">
            {expanded ? <UpOutline /> : <DownOutline />}
          </div>
        </div>
        
        <div className="mt-3 flex flex-wrap gap-1.5">
          {knowledgePoints.map(kp => (
            <KnowledgePointTag key={kp} name={kp} />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs font-medium text-rose-500">
            错误原因：{reason}
          </div>
          {onPractice && (
             <Button color="primary" fill="none" size="mini" onClick={(e) => {
               e.stopPropagation();
               onPractice();
             }} className="!p-0">
               去练习
             </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-50 bg-slate-50/50 p-4 text-sm">
          <div className="font-bold text-slate-900 mb-2">解析：</div>
          <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
}
