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

    const controller = new AbortController();
    fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('unauthorized');
        return response.json();
      })
      .then(() => {
        if (!controller.signal.aborted) setReady(true);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        router.replace(`/h5/login?next=${encodeURIComponent(pathname)}`);
      });

    return () => {
      controller.abort();
    };
  }, [pathname, router]);

  if (!ready) {
    return <div className="flex h-dvh items-center justify-center bg-slate-50 text-slate-500"><DotLoading color="primary" /> 正在检查登录状态...</div>;
  }

  return <>{children}</>;
}
