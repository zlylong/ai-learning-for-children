'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Selector, Toast } from 'antd-mobile';
import { Controller, useForm } from 'react-hook-form';
import { childFormSchema, type ChildFormValues } from '@/features/children/schema';
import { gradeOptions, textbookVersionOptions } from '@/features/children/options';
import { FixedActionBar } from './FixedActionBar';

const defaultValues: ChildFormValues = {
  name: '',
  age: 7,
  grade: '',
  province: '',
  city: '',
  textbookVersion: '',
};

export function ChildForm({
  initialValues,
  submitText,
  onSubmit,
}: Readonly<{
  initialValues?: Partial<ChildFormValues>;
  submitText: string;
  onSubmit: (values: ChildFormValues) => Promise<void>;
}>) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: { ...defaultValues, ...initialValues },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '提交失败，请稍后重试' });
    }
  });

  return (
    <form className="space-y-3 pb-24" onSubmit={submit}>
      <MobileField label="孩子姓名" error={errors.name?.message}>
        <Controller name="name" control={control} render={({ field }) => <Input placeholder="例如：小明" clearable {...field} />} />
      </MobileField>

      <MobileField label="年龄" error={errors.age?.message}>
        <Controller
          name="age"
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              placeholder="例如：8"
              value={String(field.value ?? '')}
              onChange={(value) => field.onChange(value === '' ? 0 : Number(value))}
              onBlur={field.onBlur}
            />
          )}
        />
      </MobileField>

      <MobileField label="年级" error={errors.grade?.message}>
        <Controller
          name="grade"
          control={control}
          render={({ field }) => (
            <Selector columns={3} options={gradeOptions} value={field.value ? [field.value] : []} onChange={(arr) => field.onChange(arr[0] ?? '')} />
          )}
        />
      </MobileField>

      <div className="grid grid-cols-2 gap-3">
        <MobileField label="省份" error={errors.province?.message}>
          <Controller name="province" control={control} render={({ field }) => <Input placeholder="浙江省" clearable {...field} />} />
        </MobileField>
        <MobileField label="城市" error={errors.city?.message}>
          <Controller name="city" control={control} render={({ field }) => <Input placeholder="杭州市" clearable {...field} />} />
        </MobileField>
      </div>

      <MobileField label="教材版本" error={errors.textbookVersion?.message}>
        <Controller
          name="textbookVersion"
          control={control}
          render={({ field }) => (
            <Selector columns={3} options={textbookVersionOptions} value={field.value ? [field.value] : []} onChange={(arr) => field.onChange(arr[0] ?? '')} />
          )}
        />
      </MobileField>

      <FixedActionBar>
        <Button block color="primary" size="large" loading={isSubmitting} type="submit" className="!rounded-2xl">
          {submitText}
        </Button>
      </FixedActionBar>
    </form>
  );
}

function MobileField({ label, error, children }: Readonly<{ label: string; error?: string; children: React.ReactNode }>) {
  return (
    <label className="block rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <span className="mb-3 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </label>
  );
}
