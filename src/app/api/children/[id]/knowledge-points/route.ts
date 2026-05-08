import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { childService } from '@/features/children/service';
import { listCatalogKnowledgePoints } from '@/features/learning-points/loader';
import { examUploadService } from '@/services/examUploadService';

function shouldUseMemoryStore() {
  return !process.env.DATABASE_URL || process.env.CHILDREN_STORE === 'memory';
}

async function getCatalogFallbackPoints(request: Request, childId: string) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject') ?? 'math';
  const child = await childService.get(childId);
  if (!child?.grade) return [];
  return listCatalogKnowledgePoints({
    grade: child.grade,
    subject,
    version: child.textbookVersion || 'default',
  });
}

async function withCatalogFallback(request: Request, childId: string, points: unknown[]) {
  if (points.length > 0) return NextResponse.json({ points, source: 'child-progress' });
  const fallbackPoints = await getCatalogFallbackPoints(request, childId);
  return NextResponse.json({ points: fallbackPoints, source: fallbackPoints.length > 0 ? 'learning-point-catalog' : 'empty' });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (shouldUseMemoryStore()) {
    return withCatalogFallback(request, id, examUploadService.listMemoryChildKnowledgePoints(id));
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
    return withCatalogFallback(request, id, points);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
      console.warn('[knowledge-points:get] Prisma unavailable, returning memory/catalog points:', error.message);
      return withCatalogFallback(request, id, examUploadService.listMemoryChildKnowledgePoints(id));
    }
    console.error('[knowledge-points:get]', error);
    return NextResponse.json({ error: '知识点加载失败' }, { status: 500 });
  }
}
