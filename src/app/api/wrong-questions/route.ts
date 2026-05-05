import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { examUploadService } from '@/services/examUploadService';
import { examUploadQuerySchema } from '@/schemas/examUploadSchema';

export async function GET(request: Request) {
  try {
    const childId = new URL(request.url).searchParams.get('childId');
    const parsed = examUploadQuerySchema.parse({ childId });
    const wrongQuestions = await examUploadService.listWrongQuestions(parsed.childId);
    return NextResponse.json({ wrongQuestions });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? '参数错误' }, { status: 400 });
    if (error instanceof Error && error.message.includes('无权访问')) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('[wrong-questions:get]', error);
    return NextResponse.json({ error: '错题加载失败' }, { status: 500 });
  }
}
