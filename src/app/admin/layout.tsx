import type { ReactNode } from "react";
import Link from "next/link";

import { adminSections } from "@/lib/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#16212d_0%,#1d2c3a_42%,#f1ecdf_42%,#f1ecdf_100%)]">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr] lg:px-10">
        <aside className="rounded-[2rem] border border-white/10 bg-[rgba(11,18,24,0.55)] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <p className="eyebrow !text-[rgba(255,255,255,0.72)]">运营后台</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">治理与运营总台</h1>
          <nav className="mt-8 space-y-3">
            {adminSections.map((section) => (
              <div className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4" key={section.label}>
                <p className="font-semibold">{section.label}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.72)]">{section.description}</p>
              </div>
            ))}
          </nav>
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
