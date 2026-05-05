'use client';

import { TabBar } from 'antd-mobile';

export type BottomTabKey = 'home' | 'children' | 'practice' | 'profile';

const tabs: Array<{ key: BottomTabKey; title: string; icon: string }> = [
  { key: 'home', title: '首页', icon: '🏠' },
  { key: 'children', title: '孩子', icon: '🧒' },
  { key: 'practice', title: '练习', icon: '✍️' },
  { key: 'profile', title: '我的', icon: '👤' },
];

export function BottomTabBar({ activeKey }: { activeKey: BottomTabKey }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t border-black/5 bg-white/95 backdrop-blur">
      <TabBar activeKey={activeKey} onChange={() => undefined} safeArea={false}>
        {tabs.map((item) => (
          <TabBar.Item key={item.key} icon={<span className="text-lg">{item.icon}</span>} title={item.title} />
        ))}
      </TabBar>
    </nav>
  );
}
