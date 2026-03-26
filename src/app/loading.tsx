export default function Loading() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-6">
      <div className="surface-card flex items-center gap-4">
        <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--color-accent)]" />
        <p className="text-sm font-medium text-slate-600">页面骨架加载中...</p>
      </div>
    </div>
  );
}
