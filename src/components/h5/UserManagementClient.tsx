'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog, DotLoading, ErrorBlock, Input, Toast } from 'antd-mobile';
import type { UserSummary } from '@/features/auth/schema';

type UserResponse = { users: UserSummary[] };

export function UserManagementClient() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', name: '', password: '' });

  async function loadUsers() {
    setError(null);
    const response = await fetch('/api/users', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '用户列表加载失败');
    setUsers((data as UserResponse).users);
  }

  useEffect(() => {
    loadUsers().catch((err) => setError(err instanceof Error ? err.message : '加载失败')).finally(() => setLoading(false));
  }, []);

  async function createUser() {
    setSaving(true);
    try {
      const response = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '新增用户失败');
      setForm({ username: '', name: '', password: '' });
      await loadUsers();
      Toast.show({ icon: 'success', content: '普通用户已新增' });
    } catch (err) {
      Toast.show({ icon: 'fail', content: err instanceof Error ? err.message : '新增失败' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: UserSummary) {
    const confirmed = await Dialog.confirm({
      title: '删除普通用户',
      content: `确认删除「${user.name}」吗？该用户会被强制退出登录。`,
      confirmText: '删除',
      cancelText: '取消',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '删除失败');
      await loadUsers();
      Toast.show({ icon: 'success', content: '已删除普通用户' });
    } catch (err) {
      Toast.show({ icon: 'fail', content: err instanceof Error ? err.message : '删除失败' });
    }
  }

  if (loading) return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">加载用户 <DotLoading /></div>;
  if (error) return <ErrorBlock status="busy" title="加载失败" description={error} />;

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 to-indigo-700 p-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Admin</p>
        <h2 className="mt-2 text-2xl font-bold">用户管理</h2>
        <p className="mt-2 text-sm leading-6 text-indigo-100">管理员账户不可在此删除；本页只新增和删除普通用户。</p>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h3 className="text-base font-bold text-slate-900">新增普通用户</h3>
        <Field label="用户名"><Input value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value }))} placeholder="例如 parent01" /></Field>
        <Field label="显示名称"><Input value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="例如 小明家长" /></Field>
        <Field label="初始密码"><Input type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} placeholder="至少 6 位" /></Field>
        <Button block color="primary" loading={saving} onClick={createUser} className="!rounded-2xl !font-bold">新增普通用户</Button>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h3 className="text-base font-bold text-slate-900">账户列表</h3>
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">{user.name}</div>
              <div className="mt-1 text-xs text-slate-500">{user.username} · {user.role === 'ADMIN' ? '管理员' : '普通用户'}</div>
            </div>
            {user.role === 'USER' ? <Button size="mini" fill="none" color="danger" onClick={() => deleteUser(user)}>删除</Button> : <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600">ADMIN</span>}
          </div>
        ))}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-slate-50 p-3">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="block rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">{children}</span>
    </label>
  );
}
