'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, ImageUploader, Selector, TextArea, Toast, Space } from 'antd-mobile';
import type { ImageUploadItem } from 'antd-mobile/es/components/image-uploader';
import { Controller, useForm } from 'react-hook-form';
import { examUploadFormSchema, type ExamUploadFormValues } from '@/schemas/examUploadSchema';
import { SafeAreaActionBar } from './SafeAreaActionBar';
import { ScanningOutline } from 'antd-mobile-icons';
import { useState } from 'react';

const subjectOptions = [
  { label: '数学', value: '数学' },
  { label: '语文', value: '语文' },
  { label: '英语', value: '英语' },
];

export function ExamUploadClient({ childId }: { childId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<'idle' | 'uploading' | 'analyzing' | 'matching'>('idle');
  
  const { control, handleSubmit, setValue, formState: { errors } } = useForm<ExamUploadFormValues>({
    resolver: zodResolver(examUploadFormSchema),
    defaultValues: { subject: '数学', rawText: '', imageCount: 0 },
  });

  async function submit(values: ExamUploadFormValues) {
    setStage('uploading');
    try {
      const rawText = values.rawText.trim() || `OCR mock：已收到 ${values.imageCount} 张试卷图片，请根据图片识别错题。`;
      const createResponse = await fetch('/api/exam-uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, subject: values.subject, rawText }),
      });
      const createData = (await createResponse.json().catch(() => null)) as { uploadId?: string; error?: string } | null;
      if (!createResponse.ok || !createData?.uploadId) throw new Error(createData?.error ?? '上传失败');

      setStage('analyzing');
      // Adding a small delay for better UX as requested "可以用分阶段 loading 文案"
      await new Promise(r => setTimeout(r, 1000));
      setStage('matching');
      
      const processResponse = await fetch(`/api/exam-uploads/${createData.uploadId}/process`, { method: 'POST' });
      const processData = (await processResponse.json().catch(() => null)) as { error?: string } | null;
      if (!processResponse.ok) throw new Error(processData?.error ?? '分析失败');

      Toast.show({ icon: 'success', content: '分析完成' });
      router.replace(`/h5/children/${childId}/wrong-questions`);
      router.refresh();
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '分析失败' });
      setStage('idle');
    }
  }

  const getLoadingText = () => {
    if (stage === 'uploading') return '正在读取试卷...';
    if (stage === 'analyzing') return '正在分析错题...';
    if (stage === 'matching') return '正在匹配知识点...';
    return '开始分析错题';
  };

  return (
    <form className="space-y-6 pb-32 px-4 py-6" onSubmit={handleSubmit(submit)}>
      {/* 1. Intro */}
      <section className="rounded-2xl bg-indigo-50 p-4 border border-indigo-100">
         <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
            <ScanningOutline />
            <span className="text-sm">上传说明</span>
         </div>
         <p className="text-xs text-indigo-500 leading-relaxed">
           粘贴或上传试卷结果，系统会自动找出错题和薄弱知识点。
         </p>
      </section>

      {/* 2. Paste Area */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">文本粘贴</h2>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <Controller 
            name="rawText" 
            control={control} 
            render={({ field }) => (
              <TextArea 
                placeholder="在此粘贴试卷内容、题目或 AI 识题后的文本..." 
                rows={6} 
                style={{ '--font-size': '14px' }}
                {...field} 
              />
            )} 
          />
        </div>
        {errors.rawText && <p className="text-xs text-rose-500 px-1">{errors.rawText.message}</p>}
      </section>

      {/* 3. Image Area */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">图片上传 <span className="text-xs font-normal text-slate-400">(可选)</span></h2>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <ImageUploader
            multiple
            maxCount={6}
            upload={async (file) => ({ url: URL.createObjectURL(file) })}
            onChange={(items: ImageUploadItem[]) => setValue('imageCount', items.length, { shouldValidate: true })}
          />
          {stage === 'idle' && (
            <p className="mt-3 text-[10px] text-orange-500">当前图片识别为测试功能</p>
          )}
        </div>
      </section>

      {/* 4. Confirmation */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">学科确认</h2>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <Selector
                columns={3}
                options={subjectOptions}
                value={[field.value]}
                onChange={(items) => field.onChange(String(items[0] ?? '数学'))}
                style={{
                  '--border-radius': '12px',
                  '--checked-border': '1px solid var(--adm-color-primary)',
                  '--padding': '8px',
                }}
              />
            )}
          />
        </div>
      </section>

      <SafeAreaActionBar>
        <Button 
          block 
          color="primary" 
          size="large" 
          loading={stage !== 'idle'} 
          type="submit" 
          className="!rounded-2xl !font-bold"
        >
          {getLoadingText()}
        </Button>
      </SafeAreaActionBar>
    </form>
  );
}
