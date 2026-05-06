import { AppShell } from '@/components/h5/AppShell';
import { EmptyState } from '@/components/h5/EmptyState';

export default async function WeaknessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell title="薄弱点专项训练" noPadding>
       <div className="py-20">
          <EmptyState 
            title="专项训练开发中" 
            desc="我们将根据大数据分析为您定制长期薄弱项的训练计划。" 
            icon="🚧"
          />
       </div>
    </AppShell>
  );
}
