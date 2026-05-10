import { NextResponse } from 'next/server';
import { authService } from '@/features/auth/auth-service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const admin = await authService.requireAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: '仅管理员可删除普通用户' }, { status: 403 });

  const { id } = await context.params;
  try {
    const deleted = await authService.deleteOrdinaryUser(id);
    if (!deleted) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === '只能删除普通用户') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[users] delete failed:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
