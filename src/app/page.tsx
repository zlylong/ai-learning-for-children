import { AppShell } from '@/components/h5/AppShell';
import { DiagnosticStartForm } from '@/components/h5/DiagnosticStartForm';

const features = [
  { title: '学习画像', desc: '按孩子、教材、章节沉淀学习状态。', icon: '🧒' },
  { title: '错题诊断', desc: '先用 mock AI 输出可替换的诊断结果。', icon: '📝' },
  { title: '知识点练习', desc: '围绕薄弱知识点生成练习会话。', icon: '🎯' },
];

export default function HomePage() {
  return (
    <AppShell title="AI 学习诊断" activeKey="home">
      <section className="rounded-[28px] bg-gradient-to-br from-indigo-600 to-sky-500 p-5 text-white shadow-lg">
        <p className="text-sm opacity-85">Mobile-first H5</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">让每次练习都知道下一步该学什么</h1>
        <p className="mt-3 text-sm leading-6 opacity-90">上传试卷、记录错题、定位知识点，逐步构建儿童学习诊断闭环。</p>
      </section>

      <section className="grid gap-3">
        {features.map((item) => (
          <article key={item.title} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">{item.icon}</div>
            <div>
              <h2 className="font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
            </div>
          </article>
        ))}
      </section>

      <DiagnosticStartForm />
    </AppShell>
  );
}
