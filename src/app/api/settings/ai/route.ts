import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { aiSettingsService } from '@/features/settings/ai-settings-service';
import { aiSettingsUpdateSchema } from '@/features/settings/ai-settings-schema';
import { authService } from '@/features/auth/auth-service';

export async function GET(request: Request) {
  try {
    const admin = await authService.requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '仅管理员可查看 AI 设置' }, { status: 403 });
    return NextResponse.json({ settings: await aiSettingsService.getPublicSettings() });
  } catch (error) {
    console.error('[AISettings] GET failed:', error);
    return NextResponse.json({ error: '读取 AI 设置失败' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await authService.requireAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '仅管理员可保存 AI 设置' }, { status: 403 });
    const body = await request.json();
    const input = aiSettingsUpdateSchema.parse(body);
    const settings = await aiSettingsService.updateSettings(input);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'AI 设置参数无效', issues: error.issues }, { status: 400 });
    }
    console.error('[AISettings] PUT failed:', error);
    return NextResponse.json({ error: '保存 AI 设置失败' }, { status: 500 });
  }
}
