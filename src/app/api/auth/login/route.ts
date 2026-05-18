import { NextResponse } from 'next/server';
import { loginSchema } from '@/features/auth/schema';
import { authService } from '@/features/auth/auth-service';

// Simple in-memory rate limiter for login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 5000 }); // reset every 5s
    return true;
  }

  if (entry.count >= 5) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: '登录尝试过于频繁，请等待后重试' }, { status: 429 });
  }

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
  // Only set Secure when the incoming request is actually HTTPS
  const proto = request.headers.get('x-forwarded-proto')?.toLowerCase() ?? '';
  const isHttps = proto === 'https' || request.url.startsWith('https://');
  response.cookies.set(authService.sessionCookieName, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    expires: new Date(result.expiresAt),
  });
  return response;
}
