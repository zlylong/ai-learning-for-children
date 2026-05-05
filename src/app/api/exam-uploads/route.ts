import { NextResponse } from 'next/server';
import { examService } from '@/features/exams/service';
import { examUploadInputSchema } from '@/features/exams/schema';

export async function GET(request: Request) {
  const childId = new URL(request.url).searchParams.get('childId');
  if (!childId) return NextResponse.json({ error: '缺少 childId' }, { status: 400 });
  const uploads = await examService.listUploads(childId);
  return NextResponse.json({ uploads });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = examUploadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '上传表单校验失败', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await examService.analyzeAndCreate(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[exam-uploads] analysis failed:', error);
    return NextResponse.json({ error: '分析失败，未写入任何错题数据' }, { status: 422 });
  }
}
