import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { examUploadService } from '@/services/examUploadService';
import { examUploadCreateSchema, examUploadQuerySchema } from '@/schemas/examUploadSchema';

export async function GET(request: Request) {
  try {
    const childId = new URL(request.url).searchParams.get('childId');
    const parsed = examUploadQuerySchema.parse({ childId });
    const uploads = await examUploadService.listUploads(parsed.childId);
    return NextResponse.json({ uploads });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? '参数错误' }, { status: 400 });
    if (error instanceof Error && error.message.includes('无权访问')) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('[exam-uploads:get]', error);
    return NextResponse.json({ error: '获取上传记录失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = examUploadCreateSchema.parse(await request.json());
    const upload = await examUploadService.createExamUpload(payload);
    return NextResponse.json({ uploadId: upload.id, upload }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? '参数错误' }, { status: 400 });
    if (error instanceof Error && error.message.includes('无权访问')) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('[exam-uploads:post]', error);
    return NextResponse.json({ error: '创建上传记录失败' }, { status: 500 });
  }
}
