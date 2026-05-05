import { NextResponse } from 'next/server';
import { practiceService } from '@/features/practice/service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await practiceService.getSession(id);
  if (!session) return NextResponse.json({ error: '练习不存在' }, { status: 404 });
  return NextResponse.json({ session });
}
