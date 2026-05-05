import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { practiceService } from '@/features/practice/service';
import { practiceSubmitSchema } from '@/features/practice/schema';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = practiceSubmitSchema.parse(await request.json());
    const session = await practiceService.submitSession(id, payload);
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? '参数错误' }, { status: 400 });
    }
    if (error instanceof Error && error.message === '练习不存在') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('提交')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : '提交练习失败' }, { status: 500 });
  }
}
