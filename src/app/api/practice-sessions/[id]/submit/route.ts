import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { practiceService } from '@/services/practiceService';

const submitSchema = z.object({
  answers: z.union([
    z.record(z.string().min(1), z.string().trim().min(1, '请填写答案')),
    z.array(z.object({ questionId: z.string().min(1), userAnswer: z.string().trim().min(1, '请填写答案') })),
  ]).transform((answers) => Array.isArray(answers) ? Object.fromEntries(answers.map((item) => [item.questionId, item.userAnswer])) : answers),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = submitSchema.parse(await request.json());
    const result = await practiceService.submitPracticeSession(id, payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? '参数错误' }, { status: 400 });
    }
    if (error instanceof Error && error.message === '练习不存在') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('无权访问')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && (error.message.includes('提交') || error.message.includes('完成所有题目'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[practice-sessions:submit]', error);
    return NextResponse.json({ error: '提交练习失败' }, { status: 500 });
  }
}
