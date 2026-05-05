import { NextResponse } from 'next/server';
import { examUploadService } from '@/services/examUploadService';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await examUploadService.processExamUpload(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('校验失败')) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof Error && error.message.includes('不存在')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('[exam-uploads:process]', error);
    return NextResponse.json({ error: '分析失败' }, { status: 500 });
  }
}
