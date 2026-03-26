import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-6">
      <div className="hero-panel max-w-xl px-8 py-10 text-center">
        <p className="eyebrow justify-center">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">这页暂时还没被建出来。</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          当前项目正按任务清单逐步落地，先回首页或后台看看已经就绪的骨架页面。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white"
            href="/"
          >
            返回首页
          </Link>
          <Link
            className="rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900"
            href="/admin"
          >
            去后台
          </Link>
        </div>
      </div>
    </div>
  );
}
