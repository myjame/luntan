import type { ReactNode } from "react";
import Link from "next/link";

import { AdminSidebarNav } from "@/components/layout/admin-sidebar-nav";
import { requireSuperAdmin } from "@/modules/auth/lib/guards";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireSuperAdmin();
  const displayName = user.profile?.nickname ?? user.username;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#16212d_0%,#1d2c3a_42%,#f1ecdf_42%,#f1ecdf_100%)]">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr] lg:px-10">
        <aside className="rounded-[2rem] border border-white/10 bg-[rgba(11,18,24,0.55)] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <p className="eyebrow !text-[rgba(255,255,255,0.72)]">运营后台</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">治理与运营总台</h1>
          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(255,255,255,0.58)]">
              当前登录
            </p>
            <p className="mt-3 text-lg font-semibold text-white">{displayName}</p>
            <p className="mt-1 text-sm text-[rgba(255,255,255,0.7)]">@{user.username}</p>
            <div className="mt-4 inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-medium text-[rgba(255,255,255,0.76)]">
              超级管理员
            </div>
          </div>
          <AdminSidebarNav />
          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-semibold text-white">下一阶段入口</p>
            <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.72)]">
              内容审核、圈子审核和治理日志会继续挂到这套后台壳上，当前先把用户审核与用户管理闭环打通。
            </p>
          </div>
          <div className="mt-8 flex gap-3 text-sm">
            <Link className="text-[rgba(255,255,255,0.72)] transition hover:text-white" href="/">
              前台
            </Link>
            <Link className="text-[rgba(255,255,255,0.72)] transition hover:text-white" href="/me">
              用户中心
            </Link>
          </div>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
