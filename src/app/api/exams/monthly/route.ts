import { NextResponse } from 'next/server';
import { examService } from '@/services/examService';
import { z } from 'zod';

const bodySchema = z.object({
  childId: z.string().min(1),
  subject: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式必须为 YYYY-MM'),
  questionCount: z.number().min(5).max(30).optional().default(20),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: '参数校验失败', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await examService.generateMonthlyWrongSetExam(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[MonthlyExam] Generation failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : '生成试卷失败' }, { status: 400 });
  }
}
