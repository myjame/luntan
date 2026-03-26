import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import { adminReviewUserAction } from "@/modules/auth/actions";
import {
  getAdminUserDirectorySummary,
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
  result?: string;
  message?: string;
}>;

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "暂无记录";
  }

  return dateFormatter.format(value);
}

function buildReturnTo(query: string) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
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
  const [pendingUsers, summary] = await Promise.all([
    listPendingRegistrationUsers({
      query,
      take: 12
    }),
    getAdminUserDirectorySummary()
  ]);
  const feedback = getFeedback(params.result, params.message);
  const returnTo = buildReturnTo(query);

  return (
    <div className="space-y-6 pt-2">
      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 用户审核</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">注册审核先收口，登录权限才会稳定。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里直接承接注册审核队列。审批通过后账号会进入 active，审批拒绝后会进入 rejected，并写入后台治理日志。
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
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]" method="get">
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

      {pendingUsers.length === 0 ? (
        <SurfaceCard className="grain-panel">
          <p className="eyebrow">审核队列</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前没有待审核账号</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            队列已经清空。可以去用户管理页继续查看历史审核结果，或者继续推进圈子与内容模块。
          </p>
        </SurfaceCard>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {pendingUsers.map((user) => {
            const displayName = user.profile?.nickname ?? user.username;

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
      )}
    </div>
  );
}
