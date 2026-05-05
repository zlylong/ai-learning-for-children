import { z } from 'zod';

export const childFormSchema = z.object({
  name: z.string().trim().min(1, '请输入孩子姓名').max(32, '姓名不能超过 32 个字符'),
  age: z.number({ message: '请输入年龄' }).int('年龄必须是整数').min(1, '年龄不能小于 1 岁').max(18, '年龄不能大于 18 岁'),
  grade: z.string().trim().min(1, '请选择年级').max(20, '年级过长'),
  province: z.string().trim().min(1, '请输入省份').max(32, '省份过长'),
  city: z.string().trim().min(1, '请输入城市').max(32, '城市过长'),
  textbookVersion: z.string().trim().min(1, '请输入教材版本').max(64, '教材版本过长'),
});

export const childPatchSchema = childFormSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: '至少需要提交一个字段',
});

export type ChildFormValues = z.infer<typeof childFormSchema>;
export type ChildPatchValues = z.infer<typeof childPatchSchema>;

export type ChildProfile = ChildFormValues & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiError = {
  error: string;
  issues?: unknown;
};
