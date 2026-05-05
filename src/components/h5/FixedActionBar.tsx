export function FixedActionBar({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(49px+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-[480px] border-t border-black/5 bg-white/95 px-4 py-3 backdrop-blur">
      {children}
    </div>
  );
}
