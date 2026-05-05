import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { practiceService } from '@/features/practice/service';
import { practiceSessionCreateSchema } from '@/features/practice/schema';

export async function POST(request: Request) {
  try {
    const payload = practiceSessionCreateSchema.parse(await request.json());
    const session = await practiceService.createSession(payload);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? '参数错误' }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : '创建练习失败' }, { status: 500 });
  }
}
