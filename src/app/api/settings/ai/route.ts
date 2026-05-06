import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { aiSettingsService } from '@/features/settings/ai-settings-service';
import { aiSettingsUpdateSchema } from '@/features/settings/ai-settings-schema';

export async function GET() {
  try {
    return NextResponse.json({ settings: await aiSettingsService.getPublicSettings() });
  } catch (error) {
    console.error('[AISettings] GET failed:', error);
    return NextResponse.json({ error: '读取 AI 设置失败' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
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
