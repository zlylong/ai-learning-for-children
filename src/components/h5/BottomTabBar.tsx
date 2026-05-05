'use client';

import { useRouter } from 'next/navigation';
import { TabBar } from 'antd-mobile';

export type BottomTabKey = 'home' | 'children' | 'practice' | 'profile';

const tabs: Array<{ key: BottomTabKey; title: string; icon: string; href: string }> = [
  { key: 'home', title: '首页', icon: '🏠', href: '/' },
  { key: 'children', title: '孩子', icon: '🧒', href: '/h5/children' },
  { key: 'practice', title: '练习', icon: '✍️', href: '/' },
  { key: 'profile', title: '我的', icon: '👤', href: '/' },
];

export function BottomTabBar({ activeKey }: { activeKey: BottomTabKey }) {
  const router = useRouter();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t border-black/5 bg-white/95 backdrop-blur">
      <TabBar activeKey={activeKey} onChange={(key) => router.push(tabs.find((item) => item.key === key)?.href ?? '/')} safeArea={false}>
        {tabs.map((item) => (
          <TabBar.Item key={item.key} icon={<span className="text-lg">{item.icon}</span>} title={item.title} />
        ))}
      </TabBar>
    </nav>
  );
}
