import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { childService } from '@/features/children/service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const points = await prisma.childKnowledgePoint.findMany({
      where: { childId: id },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json({ points });
  } catch (error) {
    console.error('[knowledge-points:get]', error);
    return NextResponse.json({ error: '知识点加载失败' }, { status: 500 });
  }
}
