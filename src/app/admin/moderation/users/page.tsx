import Link from "next/link";

import { UserStatus } from "@/generated/prisma/client";
import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPagination } from "@/components/layout/admin-pagination";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import { adminUpdateUserRestrictionAction } from "@/modules/moderation/actions";
import {
  getModerationDashboardSummary,
  listGovernanceUsers
} from "@/modules/moderation/lib/service";
import {
  governanceUserStatusMeta,
  userRestrictionOptions
} from "@/modules/moderation/lib/constants";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
  result?: string;
  message?: string;
}>;

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "暂无记录";
  }

  return dateFormatter.format(value);
}

function normalizePage(value?: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function sanitizeUserStatus(value?: string) {
  if (!value) {
    return undefined;
  }

  return Object.values(UserStatus).includes(value as UserStatus)
    ? (value as UserStatus)
    : undefined;
}

function buildGovernanceHref(input: {
  query?: string;
  status?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  const search = params.toString();

  return search ? `/admin/moderation/users?${search}` : "/admin/moderation/users";
}

function getFeedback(result?: string, message?: string) {
  if (result === "updated") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "治理状态已更新",
      message: message ?? "账号状态与治理动作已经写入日志。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "处理未完成",
      message: message ?? "请检查输入后再重试。"
    };
  }

  return null;
}

export default async function AdminGovernanceUsersPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = sanitizeUserStatus(params.status?.trim());
  const page = normalizePage(params.page);
  const [summary, users] = await Promise.all([
    getModerationDashboardSummary(),
    listGovernanceUsers({
      query,
      status,
      page,
      take: 12
    })
  ]);
  const feedback = getFeedback(params.result, params.message);
  const returnTo = buildGovernanceHref({
    query,
    status: status ?? "",
    page: users.page
  });

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "治理用户" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 治理用户</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">禁言和封禁都要可追溯，也要能被恢复。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里承接账号治理动作。首版支持禁言 1/3/7 天、解除禁言、封禁账号和解除封禁，并向用户发送系统通知。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/moderation/reports">返回举报处理</ButtonLink>
          <ButtonLink href="/admin/users" variant="secondary">
            查看用户总表
          </ButtonLink>
        </div>
      </div>

      {feedback ? (
        <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-2 text-sm leading-7">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="内容" label="待审帖子" value={String(summary.pendingPostCount)} />
        <MetricCard accent="内容" label="待审评论" value={String(summary.pendingCommentCount)} />
        <MetricCard accent="禁言" label="禁言账号" value={String(summary.mutedUserCount)} />
        <MetricCard accent="封禁" label="封禁账号" value={String(summary.bannedUserCount)} />
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索用户</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="用户名、昵称"
              type="search"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">当前状态</span>
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={status ?? ""}
              name="status"
            >
              <option value="">正常 / 禁言 / 封禁</option>
              <option value="ACTIVE">正常</option>
              <option value="MUTED">禁言中</option>
              <option value="BANNED">已封禁</option>
            </select>
          </label>

          <div className="flex items-end gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
              type="submit"
            >
              刷新列表
            </button>
            <ButtonLink href="/admin/moderation/users" variant="ghost">
              清空条件
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      {users.items.length === 0 ? (
        <SurfaceCard className="grain-panel">
          <p className="eyebrow">治理用户</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前没有符合条件的账号</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            可以切回举报处理页，或者查看用户总表继续追踪。
          </p>
        </SurfaceCard>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 xl:grid-cols-2">
            {users.items.map((user) => {
              const statusMeta = governanceUserStatusMeta[user.status] ?? {
                label: user.status,
                className: "border-black/10 bg-white/80 text-slate-700"
              };

              return (
                <SurfaceCard className="grain-panel h-full" key={user.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {user.profile?.nickname ?? user.username}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">@{user.username}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">最后登录</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">{formatDateTime(user.lastLoginAt)}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">受限至</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {formatDateTime(user.mutedUntil ?? user.bannedAt)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {user.profile?.bio ?? "这个账号还没有填写简介。"}
                  </p>

                  <form action={adminUpdateUserRestrictionAction} className="mt-5 space-y-3">
                    <input name="userId" type="hidden" value={user.id} />
                    <input name="returnTo" type="hidden" value={returnTo} />

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">治理动作</span>
                      <select
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                        defaultValue={user.status === "MUTED" ? "UNMUTE" : user.status === "BANNED" ? "UNBAN" : "MUTE_3_DAYS"}
                        name="action"
                      >
                        {userRestrictionOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">治理说明</span>
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-[1.2rem] border border-black/10 bg-white/90 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                        name="reason"
                        placeholder="执行禁言或封禁时请填写原因。"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                        href={`/admin/users/${user.id}?returnTo=${encodeURIComponent(returnTo)}`}
                      >
                        查看详情
                      </Link>
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
                        type="submit"
                      >
                        更新状态
                      </button>
                    </div>
                  </form>
                </SurfaceCard>
              );
            })}
          </div>

          <AdminPagination
            hrefBuilder={(nextPage) =>
              buildGovernanceHref({
                query,
                status: status ?? "",
                page: nextPage
              })
            }
            page={users.page}
            pageSize={users.pageSize}
            totalCount={users.totalCount}
            totalPages={users.totalPages}
          />
        </div>
      )}
    </div>
  );
}
