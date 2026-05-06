'use client';

import { useRouter, usePathname } from 'next/navigation';
import { TabBar } from 'antd-mobile';
import { 
  AppOutline, 
  EditSOutline, 
  FileWrongOutline, 
  UserOutline 
} from 'antd-mobile-icons';

export type BottomTabKey = 'home' | 'practice' | 'wrong-questions' | 'profile';

const tabs = [
  { key: 'home', title: '首页', icon: <AppOutline />, href: '/h5' },
  { key: 'practice', title: '练习', icon: <EditSOutline />, href: '/h5/practice' },
  { key: 'wrong-questions', title: '错题', icon: <FileWrongOutline />, href: '/h5/wrong-questions' },
  { key: 'profile', title: '我的', icon: <UserOutline />, href: '/h5/profile' },
];

export function BottomTabBar({ activeKey }: { activeKey: BottomTabKey }) {
  const router = useRouter();
  const pathname = usePathname();

  // If we are on a subpage of one of these, we might want to highlight it.
  // But for now, we just use the activeKey prop passed down.

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t border-black/5 bg-white/95 backdrop-blur">
      <TabBar 
        activeKey={activeKey} 
        onChange={(key) => {
          const tab = tabs.find((item) => item.key === key);
          if (tab) router.push(tab.href);
        }} 
        safeArea={false}
      >
        {tabs.map((item) => (
          <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
        ))}
      </TabBar>
    </nav>
  );
}
