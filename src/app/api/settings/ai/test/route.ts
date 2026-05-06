import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { aiSettingsService } from '@/features/settings/ai-settings-service';
import { aiSettingsUpdateSchema } from '@/features/settings/ai-settings-schema';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => undefined);
    const input = body ? aiSettingsUpdateSchema.parse(body) : undefined;
    const result = await aiSettingsService.testConnection(input);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: 'AI 设置参数无效', issues: error.issues }, { status: 400 });
    }
    console.error('[AISettings] test failed:', error);
    return NextResponse.json({ ok: false, error: '测试 AI 连接失败' }, { status: 500 });
  }
}
