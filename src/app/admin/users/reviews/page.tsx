import Link from "next/link";

import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPagination } from "@/components/layout/admin-pagination";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import { adminReviewDeletionAction, adminReviewUserAction } from "@/modules/auth/actions";
import {
  getAdminUserDirectorySummary,
  listPendingAccountDeletionRequests,
  listPendingRegistrationUsers
} from "@/modules/auth/lib/admin";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

type SearchParams = Promise<{
  q?: string;
  createdFrom?: string;
  createdTo?: string;
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

function sanitizeDateInput(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function buildReviewListHref(input: {
  query?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.createdFrom) {
    params.set("createdFrom", input.createdFrom);
  }

  if (input.createdTo) {
    params.set("createdTo", input.createdTo);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  const search = params.toString();

  return search ? `/admin/users/reviews?${search}` : "/admin/users/reviews";
}

function getFeedback(result?: string, message?: string) {
  if (result === "approved") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "审核已通过",
      message: message ?? "该账号已转为激活状态，可以正常登录。"
    };
  }

  if (result === "rejected") {
    return {
      className: "border-rose-500/16 bg-rose-500/8 text-rose-900",
      title: "审核已拒绝",
      message: message ?? "该账号已被退回，后续无法直接登录。"
    };
  }

  if (result === "deletion-approved") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "注销审核已通过",
      message: message ?? "账号已完成注销与脱敏处理。"
    };
  }

  if (result === "deletion-rejected") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "注销审核已拒绝",
      message: message ?? "该账号已恢复为激活状态。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "审核未完成",
      message: message ?? "请检查输入后重新提交。"
    };
  }

  return null;
}

function getInitial(label: string) {
  return label.slice(0, 1).toUpperCase();
}

export default async function AdminUserReviewsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const createdFrom = sanitizeDateInput(params.createdFrom);
  const createdTo = sanitizeDateInput(params.createdTo);
  const page = normalizePage(params.page);
  const [pendingUsers, pendingDeletionRequests, summary] = await Promise.all([
    listPendingRegistrationUsers({
      query,
      createdFrom,
      createdTo,
      page,
      take: 12
    }),
    listPendingAccountDeletionRequests({
      query,
      createdFrom,
      createdTo,
      page,
      take: 12
    }),
    getAdminUserDirectorySummary()
  ]);
  const feedback = getFeedback(params.result, params.message);
  const returnTo = buildReviewListHref({
    query,
    createdFrom,
    createdTo,
    page: pendingUsers.page
  });

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "用户审核" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 用户审核</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          注册审核与注销审核一起收口，账号状态才会稳定。
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里同时承接注册审核与注销审核。注册审批通过后账号会进入 active；注销审批通过后会执行脱敏并保留历史内容。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/users">查看用户管理</ButtonLink>
          <ButtonLink href="/admin/password-reset" variant="secondary">
            管理员工具
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
        <MetricCard accent="待办" label="待审账号" value={String(summary.pendingReviewCount)} />
        <MetricCard accent="通过" label="已激活" value={String(summary.activeUserCount)} />
        <MetricCard accent="退回" label="已拒绝" value={String(summary.rejectedUserCount)} />
        <MetricCard accent="注销" label="待注销" value={String(summary.pendingDeletionCount)} />
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索待审账号</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="用户名、邮箱、昵称"
              type="search"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">注册开始日期</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={createdFrom}
              name="createdFrom"
              type="date"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">注册结束日期</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={createdTo}
              name="createdTo"
              type="date"
            />
          </label>

          <div className="flex items-end gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
              type="submit"
            >
              筛选队列
            </button>
            <ButtonLink href="/admin/users/reviews" variant="ghost">
              清空条件
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      {pendingUsers.items.length === 0 ? (
        <SurfaceCard className="grain-panel">
          <p className="eyebrow">注册审核队列</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前没有待审核账号</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            队列已经清空。可以去用户管理页继续查看历史审核结果，或者继续推进圈子与内容模块。
          </p>
        </SurfaceCard>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 xl:grid-cols-2">
            {pendingUsers.items.map((user) => {
              const displayName = user.profile?.nickname ?? user.username;
              const detailHref = `/admin/users/${user.id}?returnTo=${encodeURIComponent(returnTo)}`;

              return (
                <SurfaceCard className="grain-panel h-full" key={user.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(197,94,61,0.12)] text-lg font-semibold text-[var(--color-accent)]">
                        {getInitial(displayName)}
                      </div>
                      <div>
                        <p className="text-lg font-semibold tracking-tight text-slate-950">{displayName}</p>
                        <p className="mt-1 text-sm text-slate-500">@{user.username}</p>
                        <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800">
                      待审核
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">注册时间</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">{formatDateTime(user.createdAt)}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">资料概览</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {user.profile?.bio ? user.profile.bio : "注册时未填写简介。"}
                      </p>
                    </div>
                  </div>

                  <form action={adminReviewUserAction} className="mt-6 space-y-4">
                    <input name="userId" type="hidden" value={user.id} />
                    <input name="returnTo" type="hidden" value={returnTo} />

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">审核说明</span>
                      <textarea
                        className="mt-2 min-h-28 w-full rounded-[1.4rem] border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                        defaultValue=""
                        name="reviewNote"
                        placeholder="通过时可留内部备注；拒绝时请填写原因。"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                        href={detailHref}
                      >
                        查看注册信息
                      </Link>
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
                        name="decision"
                        type="submit"
                        value="APPROVE"
                      >
                        通过审核
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"
                        name="decision"
                        type="submit"
                        value="REJECT"
                      >
                        拒绝并退回
                      </button>
                    </div>
                  </form>
                </SurfaceCard>
              );
            })}
          </div>

          <AdminPagination
            hrefBuilder={(nextPage) =>
              buildReviewListHref({
                query,
                createdFrom,
                createdTo,
                page: nextPage
              })
            }
            page={pendingUsers.page}
            pageSize={pendingUsers.pageSize}
            totalCount={pendingUsers.totalCount}
            totalPages={pendingUsers.totalPages}
          />
        </div>
      )}

      <SurfaceCard className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">注销审核队列</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              待注销账号需要人工确认后再执行脱敏
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              通过后账号会改为已注销身份并保留历史内容；拒绝后账号恢复为激活状态。
            </p>
          </div>
          <div className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700">
            当前待办：{pendingDeletionRequests.totalCount}
          </div>
        </div>

        {pendingDeletionRequests.items.length === 0 ? (
          <div className="mt-6 rounded-[1.35rem] border border-dashed border-black/10 bg-white/70 px-5 py-6 text-sm leading-7 text-slate-600">
            当前没有待审核的注销申请。
          </div>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {pendingDeletionRequests.items.map((request) => {
              const displayName = request.user.profile?.nickname ?? request.user.username;
              const detailHref = `/admin/users/${request.user.id}?returnTo=${encodeURIComponent(returnTo)}`;

              return (
                <div
                  className="rounded-[1.5rem] border border-black/8 bg-white/78 p-5 shadow-[0_18px_42px_rgba(24,32,45,0.06)]"
                  key={request.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(24,32,45,0.08)] text-sm font-semibold text-slate-700">
                        {getInitial(displayName)}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-950">{displayName}</p>
                        <p className="mt-1 text-sm text-slate-500">@{request.user.username}</p>
                        <p className="mt-1 text-sm text-slate-600">{request.user.email}</p>
                      </div>
                    </div>
                    <div className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-800">
                      待注销
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.1rem] border border-black/8 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600">
                    <p>申请时间：{formatDateTime(request.createdAt)}</p>
                    <p>账号状态：{request.user.status}</p>
                    <p className="mt-2">申请原因：{request.reason ?? "用户未填写补充原因。"}</p>
                  </div>

                  <form action={adminReviewDeletionAction} className="mt-4 space-y-3">
                    <input name="requestId" type="hidden" value={request.id} />
                    <input name="returnTo" type="hidden" value={returnTo} />
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">审核说明</span>
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-[1.15rem] border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                        defaultValue=""
                        name="reviewNote"
                        placeholder="通过时可填写处理说明；拒绝时必须填写原因。"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                        href={detailHref}
                      >
                        查看账号详情
                      </Link>
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
                        name="decision"
                        type="submit"
                        value="APPROVE"
                      >
                        通过并注销
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100"
                        name="decision"
                        type="submit"
                        value="REJECT"
                      >
                        拒绝申请
                      </button>
                    </div>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
