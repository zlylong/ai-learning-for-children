import { NextResponse } from 'next/server';
import { childService } from '@/features/children/service';
import { childPatchSchema } from '@/features/children/schema';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = childPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: '表单校验失败', issues: parsed.error.flatten() }, { status: 400 });
  }

  const child = await childService.update(id, parsed.data);
  if (!child) {
    return NextResponse.json({ error: '孩子档案不存在' }, { status: 404 });
  }

  return NextResponse.json({ child });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await childService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: '孩子档案不存在' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
