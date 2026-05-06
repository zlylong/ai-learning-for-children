
import { NavBar } from 'antd-mobile';
import { useRouter } from 'next/navigation';

export function PageHeader({ title, backText = '返回' }: { title: string; backText?: string }) {
  const router = useRouter();
  return (
    <NavBar onBack={() => router.back()} style={{ '--height': '50px' }}>
      {title}
    </NavBar>
  );
}
