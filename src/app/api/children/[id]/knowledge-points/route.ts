import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { childService } from '@/features/children/service';
import { listCatalogKnowledgePoints } from '@/features/learning-points/loader';
import { examUploadService } from '@/services/examUploadService';

function shouldUseMemoryStore() {
  return !process.env.DATABASE_URL || process.env.CHILDREN_STORE === 'memory';
}

type KnowledgePointLike = {
  id?: string | null;
  knowledgePointId?: string | null;
  knowledgePointText?: string | null;
  status?: string | null;
  masteryScore?: number | null;
  wrongCount?: number | null;
  practiceCount?: number | null;
  correctCount?: number | null;
};

function mergeProgressIntoCatalog(catalogPoints: KnowledgePointLike[], progressPoints: KnowledgePointLike[]) {
  const byId = new Map<string, KnowledgePointLike>();
  const byTitle = new Map<string, KnowledgePointLike>();
  for (const point of progressPoints) {
    const id = point.knowledgePointId?.trim();
    const title = point.knowledgePointText?.trim();
    if (id) byId.set(id, point);
    if (title) byTitle.set(title, point);
  }

  return catalogPoints.map((point) => {
    const progress = byId.get(point.knowledgePointId ?? '') ?? byTitle.get(point.knowledgePointText ?? '');
    if (!progress) return point;
    return {
      ...point,
      id: point.id ?? progress.id,
      status: progress.status ?? point.status,
      masteryScore: progress.masteryScore ?? point.masteryScore,
      wrongCount: progress.wrongCount ?? point.wrongCount,
      practiceCount: progress.practiceCount ?? point.practiceCount,
      correctCount: progress.correctCount ?? point.correctCount,
    };
  });
}

async function getCatalogFallbackPoints(request: Request, childId: string, progressPoints: KnowledgePointLike[] = []) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject') ?? 'math';
  const gradeOverride = searchParams.get('grade');
  const child = await childService.get(childId);
  const grade = gradeOverride || child?.grade;
  if (!grade) return [];
  const catalogPoints = await listCatalogKnowledgePoints({
    grade,
    subject,
    version: child?.textbookVersion || 'default',
  });
  return mergeProgressIntoCatalog(catalogPoints, progressPoints);
}

async function withCatalogFallback(request: Request, childId: string, points: KnowledgePointLike[]) {
  const { searchParams } = new URL(request.url);
  const gradeOverride = searchParams.get('grade');
  if (!gradeOverride && points.length > 0) return NextResponse.json({ points, source: 'child-progress' });
  const fallbackPoints = await getCatalogFallbackPoints(request, childId, points);
  return NextResponse.json({ points: fallbackPoints, source: fallbackPoints.length > 0 ? (gradeOverride ? 'learning-point-catalog-grade' : 'learning-point-catalog') : 'empty' });
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
