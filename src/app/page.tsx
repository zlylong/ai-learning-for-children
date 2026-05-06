import Link from 'next/link';
import { AppShell } from '@/components/h5/AppShell';
import { DiagnosticStartForm } from '@/components/h5/DiagnosticStartForm';

const demoChildId = 'demo-child-1';

const featureLinks = [
  {
    title: '学习画像',
    desc: '查看孩子档案、教材版本和当前学习状态。',
    icon: '🧒',
    href: '/h5/children',
    cta: '进入孩子档案',
  },
  {
    title: '错题诊断',
    desc: '上传试卷结果，生成错题原因和知识点定位。',
    icon: '📝',
    href: `/h5/children/${demoChildId}/uploads`,
    cta: '上传试卷结果',
  },
  {
    title: '知识点练习',
    desc: '围绕薄弱知识点生成练习，并更新掌握状态。',
    icon: '🎯',
    href: `/h5/children/${demoChildId}/practice/new`,
    cta: '开始知识点练习',
  },
];

const quickLinks = [
  { title: '练习中心', desc: '查看孩子练习入口', href: '/h5/practice', icon: '✍️' },
  { title: '月度错题卷', desc: '按月复习高频错题', href: `/h5/children/${demoChildId}/exams/monthly`, icon: '📚' },
  { title: '错题本', desc: '查看错题和知识点', href: `/h5/children/${demoChildId}/wrong-questions`, icon: '📌' },
  { title: 'AI 高级设置', desc: '配置模型和接口', href: '/h5/profile/advanced-settings', icon: '⚙️' },
];

export default function HomePage() {
  return (
    <AppShell title="AI 学习诊断" activeKey="home">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-sky-500 to-cyan-400 p-5 text-white shadow-lg">
        <p className="text-sm font-medium opacity-90">Mobile-first H5</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight">让每次练习都知道下一步该学什么</h1>
        <p className="mt-3 text-sm leading-6 opacity-90">上传试卷、记录错题、定位知识点，逐步构建儿童学习诊断闭环。</p>
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">核心功能</h2>
            <p className="mt-1 text-xs text-slate-500">每个入口都可直接点击跳转</p>
          </div>
          <span className="text-xs font-semibold text-indigo-600">Demo</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {featureLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex min-h-[88px] flex-col items-center justify-center rounded-2xl bg-slate-50 px-2 py-3 text-center ring-1 ring-slate-100 active:scale-[0.99]"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="mt-2 text-sm font-semibold leading-5 text-slate-950">{item.title}</span>
              <span className="mt-1 text-[11px] leading-4 text-indigo-600">{item.cta}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">快捷入口</h2>
            <p className="mt-1 text-xs text-slate-500">常用功能一键到达</p>
          </div>
          <Link href="/h5/profile" className="text-xs font-semibold text-indigo-600">
            我的
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 active:scale-[0.99]"
            >
              <div className="text-2xl">{item.icon}</div>
              <h3 className="mt-2 text-sm font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <DiagnosticStartForm />
    </AppShell>
  );
}
