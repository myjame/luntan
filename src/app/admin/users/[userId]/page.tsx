import { notFound } from "next/navigation";

import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { adminReviewUserAction } from "@/modules/auth/actions";
import {
  getAdminUserDetail,
  getAdminUserRoleMeta,
  getAdminUserStatusMeta
} from "@/modules/auth/lib/admin";
import { requireSuperAdmin } from "@/modules/auth/lib/guards";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

type PageParams = Promise<{
  userId: string;
}>;

type SearchParams = Promise<{
  returnTo?: string;
  result?: string;
  message?: string;
  from?: string;
}>;

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "暂无记录";
  }

  return dateFormatter.format(value);
}

function resolveReturnTo(rawValue?: string) {
  return rawValue && rawValue.startsWith("/") ? rawValue : "/admin/users/reviews";
}

function getFeedback(result?: string, message?: string) {
  if (result === "approved") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "审核已通过",
      message: message ?? "该账号已转为激活状态。"
    };
  }

  if (result === "rejected") {
    return {
      className: "border-rose-500/16 bg-rose-500/8 text-rose-900",
      title: "审核已拒绝",
      message: message ?? "该账号已转为拒绝状态。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "处理未完成",
      message: message ?? "请检查后重新提交。"
    };
  }

  return null;
}

function buildCurrentDetailHref(userId: string, returnTo: string, from?: string) {
  const params = new URLSearchParams();

  params.set("returnTo", returnTo);

  if (from) {
    params.set("from", from);
  }

  return `/admin/users/${userId}?${params.toString()}`;
}

export default async function AdminUserDetailPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  await requireSuperAdmin();

  const [{ userId }, query] = await Promise.all([params, searchParams]);
  const user = await getAdminUserDetail(userId);

  if (!user) {
    notFound();
  }

  const returnTo = resolveReturnTo(query.returnTo);
  const statusMeta = getAdminUserStatusMeta(user.status);
  const roleMeta = getAdminUserRoleMeta(user.role);
  const reviewedBy = user.reviewedBy?.profile?.nickname ?? user.reviewedBy?.username ?? null;
  const feedback = getFeedback(query.result, query.message);
  const displayName = user.profile?.nickname ?? user.username;
  const backLabel = query.from === "dashboard" ? "返回后台首页" : "返回列表";
  const currentDetailHref = buildCurrentDetailHref(user.id, returnTo, query.from);

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "用户管理", href: "/admin/users" },
          { label: displayName }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 注册信息详情</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{displayName}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里集中查看当前账号的注册资料、审核结果和登录状态。待审核用户可以直接在这个页面完成通过或拒绝。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={returnTo}>{backLabel}</ButtonLink>
          {user.status === "PENDING_REVIEW" ? (
            <ButtonLink href="/admin/users/reviews" variant="secondary">
              返回审核队列
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {feedback ? (
        <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-2 text-sm leading-7">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SurfaceCard className="grain-panel">
          <p className="eyebrow">注册资料</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoItem label="用户名" value={`@${user.username}`} />
            <InfoItem label="邮箱" value={user.email} />
            <InfoItem label="昵称" value={user.profile?.nickname ?? "未填写"} />
            <InfoItem label="注册时间" value={formatDateTime(user.createdAt)} />
            <InfoItem label="最后登录" value={formatDateTime(user.lastLoginAt)} />
            <InfoItem label="头像地址" value={user.profile?.avatarUrl ?? "未填写"} />
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-black/8 bg-white/78 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">简介</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{user.profile?.bio ?? "注册时未填写简介。"}</p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoItem
              label="私信权限"
              value={user.settings?.directMessagePermission ?? "未初始化"}
            />
            <InfoItem
              label="首页频道记忆"
              value={user.settings?.homepageLastFeedChannel ?? "未初始化"}
            />
          </div>
        </SurfaceCard>

        <div className="space-y-5">
          <SurfaceCard>
            <p className="eyebrow">账号状态</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${roleMeta.className}`}>
                {roleMeta.label}
              </span>
            </div>

            <div className="mt-5 space-y-2 text-sm leading-7 text-slate-600">
              <p>审核时间：{formatDateTime(user.reviewedAt)}</p>
              <p>审核人：{reviewedBy ?? "暂无记录"}</p>
              <p>注销申请：{formatDateTime(user.deletionRequestedAt)}</p>
              {user.reviewNote ? <p>审核备注：{user.reviewNote}</p> : <p>审核备注：暂无记录</p>}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <p className="eyebrow">审核动作</p>
            {user.status === "PENDING_REVIEW" ? (
              <form action={adminReviewUserAction} className="mt-4 space-y-4">
                <input name="userId" type="hidden" value={user.id} />
                <input name="returnTo" type="hidden" value={currentDetailHref} />

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">审核说明</span>
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-[1.4rem] border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                    defaultValue=""
                    name="reviewNote"
                    placeholder="通过时可留备注；拒绝时请填写原因。"
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
            ) : (
              <div className="mt-4 rounded-[1.25rem] border border-black/8 bg-white/70 px-4 py-4 text-sm leading-7 text-slate-600">
                当前账号已经离开待审核状态，不再显示审批按钮。后续如需治理动作，可以在用户管理和后续治理模块继续处理。
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
