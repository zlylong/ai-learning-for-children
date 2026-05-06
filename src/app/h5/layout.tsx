export default function H5Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {children}
    </div>
  );
}
