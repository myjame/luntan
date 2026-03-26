import Link from "next/link";
import type { Route } from "next";

import { siteNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[rgba(245,239,228,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-base font-bold text-white shadow-[0_16px_40px_rgba(197,94,61,0.28)]">
            论
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-500">luntan</p>
            <p className="text-base font-semibold text-slate-950">公开兴趣社区</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-black/8 bg-white/65 p-1 shadow-[0_12px_30px_rgba(24,32,45,0.06)] md:flex">
          {siteNavigation.map((item) => (
            <Link
              key={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
              )}
              href={item.href as Route}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/login">
            登录
          </Link>
          <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/register">
            注册
          </Link>
          <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me">
            个人中心
          </Link>
          <Link
            className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
            href="/admin"
          >
            管理后台
          </Link>
        </div>
      </div>
    </header>
  );
}
