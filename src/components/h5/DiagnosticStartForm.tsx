'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Selector, Toast } from 'antd-mobile';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const diagnosticSchema = z.object({
  childName: z.string().min(1, '请输入孩子姓名').max(32, '姓名过长'),
  grade: z.string().min(1, '请选择年级'),
});

type DiagnosticFormValues = z.infer<typeof diagnosticSchema>;

const gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'].map((grade) => ({ label: grade, value: grade }));

export function DiagnosticStartForm() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<DiagnosticFormValues>({
    resolver: zodResolver(diagnosticSchema),
    defaultValues: { childName: '', grade: '' },
  });

  const onSubmit = (values: DiagnosticFormValues) => {
    Toast.show({
      icon: 'success',
      content: `${values.childName} 的${values.grade}诊断入口已就绪`,
    });
  };

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-950">开始一次学习诊断</h2>
        <p className="mt-1 text-sm text-slate-500">当前仅建立 H5 入口与表单骨架，AI 结果由 mock provider 返回。</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block rounded-2xl bg-slate-50 p-3">
          <span className="mb-2 block text-sm font-medium text-slate-700">孩子姓名</span>
          <Controller
            name="childName"
            control={control}
            render={({ field }) => <Input placeholder="例如：小明" clearable {...field} />}
          />
          {errors.childName ? <p className="mt-2 text-xs text-red-500">{errors.childName.message}</p> : null}
        </label>

        <div className="rounded-2xl bg-slate-50 p-3">
          <span className="mb-2 block text-sm font-medium text-slate-700">年级</span>
          <Controller
            name="grade"
            control={control}
            render={({ field }) => (
              <Selector
                columns={3}
                options={gradeOptions}
                value={field.value ? [field.value] : []}
                onChange={(arr) => field.onChange(arr[0] ?? '')}
              />
            )}
          />
          {errors.grade ? <p className="mt-2 text-xs text-red-500">{errors.grade.message}</p> : null}
        </div>

        <Button block color="primary" size="large" loading={isSubmitting} type="submit" className="!rounded-2xl">
          查看诊断入口
        </Button>
      </form>
    </section>
  );
}
