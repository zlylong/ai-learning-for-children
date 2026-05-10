'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DotLoading } from 'antd-mobile';

const PUBLIC_PATHS = ['/h5/login'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      setReady(true);
      return;
    }

    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('unauthorized');
        return response.json();
      })
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) router.replace(`/h5/login?next=${encodeURIComponent(pathname)}`);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return <div className="flex h-dvh items-center justify-center bg-slate-50 text-slate-500"><DotLoading color="primary" /> 正在检查登录状态...</div>;
  }

  return <>{children}</>;
}
