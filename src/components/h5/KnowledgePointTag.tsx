
export function KnowledgePointTag({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
      active 
      ? 'bg-indigo-600 text-white shadow-sm' 
      : 'bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/20'
    }`}>
      {name}
    </span>
  );
}
