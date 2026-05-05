'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, ImageUploader, TextArea, Toast } from 'antd-mobile';
import type { ImageUploadItem } from 'antd-mobile/es/components/image-uploader';
import { Controller, useForm } from 'react-hook-form';
import { examUploadFormSchema, type ExamUploadFormValues } from '@/features/exams/schema';
import { FixedActionBar } from './FixedActionBar';

export function ExamUploadClient({ childId }: { childId: string }) {
  const router = useRouter();
  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ExamUploadFormValues>({
    resolver: zodResolver(examUploadFormSchema),
    defaultValues: { text: '', imageCount: 0 },
  });

  async function submit(values: ExamUploadFormValues) {
    const response = await fetch('/api/exam-uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, ...values }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? '分析失败');
    }
    Toast.show({ icon: 'success', content: '分析完成，已生成错题卡片' });
    router.replace(`/h5/children/${childId}/wrong-questions`);
    router.refresh();
  }

  return (
    <form className="space-y-4 pb-24" onSubmit={handleSubmit((values) => submit(values).catch((error) => Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '分析失败' })))}>
      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-lg font-bold text-slate-950">粘贴试卷结果文本</h2>
        <p className="mt-1 text-sm text-slate-500">支持从微信、钉钉、拍照识题等 APP 复制结果后直接粘贴。</p>
        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <Controller name="text" control={control} render={({ field }) => <TextArea placeholder="例如：题目：36+27=？ 学生答案：62 正确答案：63..." rows={8} maxLength={10000} showCount {...field} />} />
        </div>
        {errors.text ? <p className="mt-2 text-xs text-red-500">{errors.text.message}</p> : null}
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-lg font-bold text-slate-950">上传图片</h2>
        <p className="mt-1 text-sm text-slate-500">OCR 暂时使用 mock，不会上传真实图片到 AI 服务。</p>
        <div className="mt-4">
          <ImageUploader
            multiple
            maxCount={6}
            upload={async (file) => ({ url: URL.createObjectURL(file) })}
            onChange={(items: ImageUploadItem[]) => setValue('imageCount', items.length, { shouldValidate: true })}
          />
        </div>
      </section>

      <Link href={`/h5/children/${childId}/wrong-questions`} className="block rounded-3xl bg-indigo-50 p-4 text-sm font-semibold text-indigo-600">
        查看历史错题分析 →
      </Link>

      <FixedActionBar>
        <Button block color="primary" size="large" loading={isSubmitting} type="submit" className="!rounded-2xl">
          {isSubmitting ? '分析中...' : '开始分析'}
        </Button>
      </FixedActionBar>
    </form>
  );
}
