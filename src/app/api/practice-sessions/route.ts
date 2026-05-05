import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { practiceSessionCreateSchema } from '@/features/practice/schema';
import { practiceService } from '@/services/practiceService';

export async function POST(request: Request) {
  try {
    const payload = practiceSessionCreateSchema.parse(await request.json());
    const result = await practiceService.createPracticeSession(payload);
    return NextResponse.json({ sessionId: result.sessionId, session: result.session }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? '参数错误' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('无权访问')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes('校验失败')) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error('[practice-sessions:post]', error);
    return NextResponse.json({ error: '创建练习失败' }, { status: 500 });
  }
}
