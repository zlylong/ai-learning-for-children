import { Suspense } from 'react';
import { LoginClient } from '@/components/h5/LoginClient';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex h-dvh max-w-[480px] items-center justify-center bg-slate-50 text-slate-500">加载登录页...</div>}>
      <LoginClient />
    </Suspense>
  );
}
