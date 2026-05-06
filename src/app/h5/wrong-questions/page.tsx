import { AppShell } from '@/components/h5/AppShell';
import { WrongQuestionsWrapper } from '@/components/h5/WrongQuestionsWrapper';

export default function WrongQuestionsPage() {
  return (
    <AppShell title="错题本" activeKey="wrong-questions">
      <WrongQuestionsWrapper />
    </AppShell>
  );
}
