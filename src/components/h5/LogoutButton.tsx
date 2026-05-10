'use client';

import { useRouter } from 'next/navigation';
import { Toast } from 'antd-mobile';

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    Toast.show({ icon: 'success', content: '已退出登录' });
    router.replace('/h5/login');
  }

  return (
    <button onClick={logout} className="h-14 w-full rounded-2xl bg-white border border-rose-100 text-base font-bold text-rose-500 shadow-sm active:bg-rose-50 transition-colors">
      退出登录
    </button>
  );
}
