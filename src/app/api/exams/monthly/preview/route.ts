import { NextResponse } from 'next/server';
import { examService } from '@/services/examService';
import { z } from 'zod';

const querySchema = z.object({
  childId: z.string().min(1),
  subject: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式必须为 YYYY-MM'),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');
  const subject = searchParams.get('subject');
  const month = searchParams.get('month');

  const parsed = querySchema.safeParse({ childId, subject, month });
  if (!parsed.success) {
    return NextResponse.json({ error: '参数校验失败', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const preview = await examService.getMonthlyExamPreview(parsed.data);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '获取预览失败' }, { status: 400 });
  }
}
