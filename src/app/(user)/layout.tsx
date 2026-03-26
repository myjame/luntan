import type { ReactNode } from "react";
import Link from "next/link";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">用户中心</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">我的社区空间</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/">
              返回首页
            </Link>
            <Link
              className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900"
              href="/admin"
            >
              去后台
            </Link>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-6 pb-12 lg:px-10">{children}</main>
    </div>
  );
}
