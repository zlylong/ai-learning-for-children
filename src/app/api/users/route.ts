import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { userCreateSchema } from '@/features/auth/schema';
import { authService } from '@/features/auth/auth-service';

export async function GET(request: Request) {
  const admin = await authService.requireAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: '仅管理员可查看用户列表' }, { status: 403 });
  return NextResponse.json({ users: await authService.listUsers() });
}

export async function POST(request: Request) {
  const admin = await authService.requireAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: '仅管理员可新增普通用户' }, { status: 403 });

  try {
    const body = await request.json();
    const input = userCreateSchema.parse(body);
    const user = await authService.createUser(input);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: '用户参数无效', issues: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === '用户名已存在') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[users] create failed:', error);
    return NextResponse.json({ error: '新增用户失败' }, { status: 500 });
  }
}
