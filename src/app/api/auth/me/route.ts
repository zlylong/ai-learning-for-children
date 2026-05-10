import { NextResponse } from 'next/server';
import { authService } from '@/features/auth/auth-service';

export async function GET(request: Request) {
  const user = await authService.getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  return NextResponse.json({ user });
}
