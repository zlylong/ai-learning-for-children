import { AppShell } from '@/components/h5/AppShell';
import { AiAdvancedSettingsClient } from '@/components/h5/AiAdvancedSettingsClient';

export default function AdvancedSettingsPage() {
  return (
    <AppShell title="高级设置" activeKey="profile">
      <AiAdvancedSettingsClient />
    </AppShell>
  );
}
