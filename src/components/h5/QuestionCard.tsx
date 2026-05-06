
import { Radio, Space, Input, TextArea } from 'antd-mobile';

export type QuestionType = 'choice' | 'fill' | 'essay';

interface QuestionCardProps {
  content: string;
  type: QuestionType;
  options?: { label: string; value: string }[];
  value?: string;
  onChange: (value: string) => void;
}

export function QuestionCard({ content, type, options, value, onChange }: QuestionCardProps) {
  return (
    <div className="space-y-6">
      <div className="text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>

      <div className="pt-4">
        {type === 'choice' && options && (
          <Radio.Group value={value} onChange={val => onChange(val as string)}>
            <Space direction="vertical" block className="w-full">
              {options.map(opt => (
                <Radio 
                  key={opt.value} 
                  value={opt.value} 
                  block
                  className="!flex items-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm active:bg-slate-50 [&_.adm-radio-content]:flex-1"
                >
                  <span className="text-base text-slate-700">{opt.label}</span>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}

        {type === 'fill' && (
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
             <Input 
              placeholder="请输入答案" 
              value={value} 
              onChange={onChange} 
              className="text-lg"
              style={{ '--font-size': '18px' }}
            />
          </div>
        )}

        {type === 'essay' && (
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
            <TextArea
              placeholder="请输入详细解答过程"
              value={value}
              onChange={onChange}
              rows={6}
              className="text-lg"
              style={{ '--font-size': '16px' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
