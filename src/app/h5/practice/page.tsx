import { AppShell } from '@/components/h5/AppShell';
import { PracticeEntryClient } from '@/components/h5/PracticeEntryClient';

export default function PracticePage() {
  return (
    <AppShell title="练习中心" activeKey="practice">
      <PracticeEntryClient />
    </AppShell>
  );
}
