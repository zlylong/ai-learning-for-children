import { NextResponse } from 'next/server';
import { loginSchema } from '@/features/auth/schema';
import { authService } from '@/features/auth/auth-service';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: '请输入用户名和密码', issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await authService.login(parsed.data);
  if (!result) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(authService.sessionCookieName, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.AUTH_COOKIE_SECURE === 'true',
    path: '/',
    expires: new Date(result.expiresAt),
  });
  return response;
}
