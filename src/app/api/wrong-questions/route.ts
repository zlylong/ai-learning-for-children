import { NextResponse } from 'next/server';
import { examService } from '@/features/exams/service';

export async function GET(request: Request) {
  const childId = new URL(request.url).searchParams.get('childId');
  if (!childId) return NextResponse.json({ error: '缺少 childId' }, { status: 400 });
  const wrongQuestions = await examService.listWrongQuestions(childId);
  return NextResponse.json({ wrongQuestions });
}
