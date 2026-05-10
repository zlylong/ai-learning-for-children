import { z } from 'zod';

export const USER_ROLES = ['ADMIN', 'USER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入用户名').max(32, '用户名不能超过 32 个字符'),
  password: z.string().min(1, '请输入密码').max(128, '密码不能超过 128 个字符'),
});

export const userCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, '用户名至少 3 个字符')
    .max(32, '用户名不能超过 32 个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和短横线'),
  name: z.string().trim().min(1, '请输入显示名称').max(32, '显示名称不能超过 32 个字符'),
  password: z.string().min(6, '密码至少 6 位').max(128, '密码不能超过 128 个字符'),
});

export const userPasswordUpdateSchema = z.object({
  password: z.string().min(6, '密码至少 6 位').max(128, '密码不能超过 128 个字符'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type UserCreateValues = z.infer<typeof userCreateSchema>;

export type UserSummary = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type CurrentUser = UserSummary;
