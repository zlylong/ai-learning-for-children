'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Toast } from 'antd-mobile';
import { ChildForm } from './ChildForm';
import type { ChildFormValues, ChildProfile } from '@/features/children/schema';

export function ChildCreateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialValues = {
    name: searchParams.get('name') ?? '',
    grade: searchParams.get('grade') ?? '',
  };

  async function createChild(values: ChildFormValues) {
    const response = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) throw new Error('创建失败，请检查表单');
    const data = (await response.json()) as { child: ChildProfile };
    Toast.show({ icon: 'success', content: '孩子档案已创建' });
    router.replace(`/h5/children/${data.child.id}`);
    router.refresh();
  }

  return <ChildForm submitText="保存孩子档案" initialValues={initialValues} onSubmit={createChild} />;
}
