import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authService } from '@/features/auth/auth-service';
import { promptTemplatePackUploadSchema, promptTemplateService } from '@/features/prompt-templates/service';

export async function GET() {
  try {
    const [summary, defaultPack] = await Promise.all([
      promptTemplateService.listTemplates(),
      promptTemplateService.exportDefaultPack(),
    ]);
    return NextResponse.json({ ...summary, defaultPack });
  } catch (error) {
    console.error('[prompt-templates] GET failed:', error);
    return NextResponse.json({ error: '提示词模板读取失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await authService.requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '仅管理员可上传提示词包' }, { status: 403 });
    const body = await request.json();
    const input = promptTemplatePackUploadSchema.parse(body);
    const result = await promptTemplateService.installPack(input);
    return NextResponse.json({ package: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: '提示词包格式无效', issues: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '提示词包上传失败';
    const status = message.includes('已存在') ? 409 : 500;
    console.error('[prompt-templates] POST failed:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
