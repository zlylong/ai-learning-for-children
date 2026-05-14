import { AppShell } from '@/components/h5/AppShell';
import { PromptTemplatesClient } from '@/components/h5/PromptTemplatesClient';

export default function PromptTemplatesPage() {
  return (
    <AppShell title="提示词包管理" activeKey="profile">
      <PromptTemplatesClient />
    </AppShell>
  );
}
