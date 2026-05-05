import { NextResponse } from 'next/server';
import { childService } from '@/features/children/service';
import { childFormSchema } from '@/features/children/schema';

export async function GET() {
  const children = await childService.list();
  return NextResponse.json({ children });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = childFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: '表单校验失败', issues: parsed.error.flatten() }, { status: 400 });
  }

  const child = await childService.create(parsed.data);
  return NextResponse.json({ child }, { status: 201 });
}
