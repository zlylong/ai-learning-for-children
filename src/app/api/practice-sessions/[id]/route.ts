import { NextResponse } from 'next/server';
import { practiceService } from '@/services/practiceService';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await practiceService.getPracticeSession(id);
    if (!session) return NextResponse.json({ error: '练习不存在' }, { status: 404 });
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof Error && error.message.includes('无权访问')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[practice-sessions:get]', error);
    return NextResponse.json({ error: '获取练习失败' }, { status: 500 });
  }
}
