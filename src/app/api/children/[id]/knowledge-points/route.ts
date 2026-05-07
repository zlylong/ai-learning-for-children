import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function shouldUseMemoryStore() {
  return !process.env.DATABASE_URL || process.env.CHILDREN_STORE === 'memory';
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (shouldUseMemoryStore()) {
    return NextResponse.json({ points: [] });
  }

  try {
    const points = await prisma.childKnowledgePoint.findMany({
      where: { childId: id },
      orderBy: [
        { status: 'asc' },
        { wrongCount: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
    return NextResponse.json({ points });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
      console.warn('[knowledge-points:get] Prisma unavailable, returning empty points:', error.message);
      return NextResponse.json({ points: [] });
    }
    console.error('[knowledge-points:get]', error);
    return NextResponse.json({ error: '知识点加载失败' }, { status: 500 });
  }
}
