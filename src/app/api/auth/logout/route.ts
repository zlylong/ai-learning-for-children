import { NextResponse } from 'next/server';
import { authService } from '@/features/auth/auth-service';

export async function POST(request: Request) {
  const token = request.headers.get('cookie')?.match(new RegExp(`(?:^|; )${authService.sessionCookieName}=([^;]+)`))?.[1];
  await authService.logout(token ? decodeURIComponent(token) : undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authService.sessionCookieName, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
