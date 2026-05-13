import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authService } from '@/features/auth/auth-service';
import { installLearningPointCatalogPackage, learningPointPackageUploadSchema } from '@/features/learning-points/package-service';

export async function POST(request: Request) {
  try {
    const admin = await authService.requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '仅管理员可上传知识点包' }, { status: 403 });
    const body = await request.json();
    const input = learningPointPackageUploadSchema.parse(body);
    const result = await installLearningPointCatalogPackage(input);
    return NextResponse.json({ package: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: '知识点包格式无效', issues: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '知识点包上传失败';
    const status = message.includes('已存在') ? 409 : 500;
    console.error('[learning-point-packages] POST failed:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
