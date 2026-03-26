import Link from "next/link";
import type { Route } from "next";

import { getStatusMeta } from "@/modules/auth/lib/status";
import type { AuthUserStatus } from "@/modules/auth/lib/types";

const supportedStatuses = new Set<AuthUserStatus>([
  "PENDING_REVIEW",
  "ACTIVE",
  "REJECTED",
  "MUTED",
  "BANNED",
  "DISABLED",
  "PENDING_DELETION"
]);

export default async function AccountStatusPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const params = await searchParams;
  const status = supportedStatuses.has(params.status as AuthUserStatus)
    ? (params.status as AuthUserStatus)
    : "PENDING_REVIEW";
  const meta = getStatusMeta(status);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow">账号状态</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{meta.title}</h1>
        <p className="mt-4 text-sm leading-8 text-slate-600">{meta.description}</p>
        <div className="mt-6 inline-flex w-fit rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700">
          当前状态：{meta.tone}
        </div>
      </div>

      <div className="surface-card">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">接下来会发生什么</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {status === "PENDING_REVIEW"
                ? "管理员会在后台审核注册信息，审核通过后账号才能登录。"
                : status === "PENDING_DELETION"
                  ? "管理员审核通过后会执行账号脱敏和历史内容保留，不会直接硬删除。"
                  : "如需继续处理，可根据当前状态返回对应入口。"}
            </p>
          </div>

          <div className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">可执行操作</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white"
                href={meta.actionHref as Route}
              >
                {meta.actionLabel}
              </Link>
              <Link
                className="rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900"
                href="/"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>

        {params.source ? (
          <p className="mt-6 text-sm text-slate-500">来源：{params.source === "register" ? "注册流程" : "注销流程"}</p>
        ) : null}
      </div>
    </div>
  );
}
