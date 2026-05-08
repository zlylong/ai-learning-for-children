import { NextResponse } from 'next/server';
import { listCatalogKnowledgePoints, loadLearningPointCatalog } from '@/features/learning-points/loader';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const grade = searchParams.get('grade') ?? '';
  const subject = searchParams.get('subject') ?? 'math';
  const version = searchParams.get('version') ?? 'default';
  const view = searchParams.get('view') ?? 'catalog';

  try {
    if (view === 'points') {
      const points = await listCatalogKnowledgePoints({ grade, subject, version });
      return NextResponse.json({ points });
    }

    const catalog = await loadLearningPointCatalog({ grade, subject, version });
    if (!catalog) {
      return NextResponse.json({ error: '未找到匹配的学习要点文件' }, { status: 404 });
    }
    return NextResponse.json({ catalog });
  } catch (error) {
    console.error('[learning-points:get]', error);
    return NextResponse.json({ error: '学习要点文件读取失败' }, { status: 500 });
  }
}
