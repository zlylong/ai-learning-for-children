'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Toast } from 'antd-mobile';

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '登录失败');
      Toast.show({ icon: 'success', content: '登录成功' });
      const next = searchParams.get('next') || '/h5';
      router.replace(next.startsWith('/h5') ? next : '/h5');
    } catch (error) {
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '登录失败' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col justify-center bg-slate-50 px-5">
      <section className="rounded-[32px] bg-gradient-to-br from-indigo-600 to-slate-950 p-6 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">AI Learning</p>
        <h1 className="mt-3 text-3xl font-black">登录学习助手</h1>
        <p className="mt-3 text-sm leading-6 text-indigo-100">管理员可配置 AI 模型和管理普通用户；普通用户可使用学习、练习与错题功能。</p>
      </section>

      <section className="mt-5 space-y-4 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
        <Field label="用户名">
          <Input value={username} onChange={setUsername} placeholder="请输入用户名" clearable />
        </Field>
        <Field label="密码">
          <Input value={password} onChange={setPassword} placeholder="请输入密码" type="password" clearable onEnterPress={login} />
        </Field>
        <Button block color="primary" size="large" loading={loading} onClick={login} className="!mt-6 !rounded-2xl !font-bold">登录</Button>
        <p className="text-center text-xs leading-5 text-slate-400">首次启动默认管理员：admin / admin123456。请登录后新增普通用户，并在服务器 .data/users.json 中妥善保管账户数据。</p>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-slate-50 p-3">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <span className="block rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">{children}</span>
    </label>
  );
}
