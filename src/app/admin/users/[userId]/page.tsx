import { notFound } from "next/navigation";

import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { Button, ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { adminReviewDeletionAction, adminReviewUserAction } from "@/modules/auth/actions";
import {
  getAdminUserDetail,
  getAdminUserRoleMeta,
  getAdminUserStatusMeta
} from "@/modules/auth/lib/admin";
import { requireSuperAdmin } from "@/modules/auth/lib/guards";
import {
  assignUserBadgeAction,
  removeUserBadgeAction,
  updateUserIdentityDisplayAction
} from "@/modules/operations/actions";
import { badgeKindLabel } from "@/modules/operations/lib/constants";
import { listActiveBadgesForAssignment } from "@/modules/operations/lib/service";

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
      title: "处理未完成",
      message: message ?? "请检查后重新提交。"
    };
  }

  if (result === "badge-assigned") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "身份已授予",
      message: message ?? "勋章或头衔已经授予给该用户。"
    };
  }

  if (result === "badge-removed") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "身份已移除",
      message: message ?? "勋章或头衔授予关系已经解除。"
    };
  }

  if (result === "identity-updated") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "展示位已更新",
      message: message ?? "用户公开展示的勋章和头衔已经刷新。"
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
  const [user, badgeOptions] = await Promise.all([
    getAdminUserDetail(userId),
    listActiveBadgesForAssignment()
  ]);

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
  const grantedBadgeIds = new Set(user.userBadges.map((item) => item.badge.id));
  const grantedBadgeOptions = user.userBadges.filter((item) => item.badge.kind === "BADGE");
  const grantedTitleOptions = user.userBadges.filter((item) => item.badge.kind === "TITLE");
  const availableBadgeOptions = badgeOptions.filter((badge) => !grantedBadgeIds.has(badge.id));
  const pendingDeletionRequest = user.deletionRequests[0] ?? null;

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
            ) : user.status === "PENDING_DELETION" && pendingDeletionRequest ? (
              <form action={adminReviewDeletionAction} className="mt-4 space-y-4">
                <input name="requestId" type="hidden" value={pendingDeletionRequest.id} />
                <input name="returnTo" type="hidden" value={currentDetailHref} />

                <div className="rounded-[1.25rem] border border-orange-500/20 bg-orange-500/8 px-4 py-4 text-sm leading-7 text-orange-900">
                  <p>注销申请时间：{formatDateTime(pendingDeletionRequest.createdAt)}</p>
                  <p className="mt-2">申请原因：{pendingDeletionRequest.reason ?? "用户未填写补充原因。"}</p>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">审核说明</span>
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-[1.4rem] border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                    defaultValue=""
                    name="reviewNote"
                    placeholder="通过时可填写处理说明；拒绝时请填写原因。"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
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
            ) : (
              <div className="mt-4 rounded-[1.25rem] border border-black/8 bg-white/70 px-4 py-4 text-sm leading-7 text-slate-600">
                当前账号已经离开待审核状态，不再显示审批按钮。后续如需治理动作，可以在用户管理和后续治理模块继续处理。
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <p className="eyebrow">身份展示位</p>
            <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
              <p>当前精选勋章：{user.profile?.featuredBadge?.name ?? "未设置"}</p>
              <p>当前公开头衔：{user.profile?.titleBadge?.name ?? "未设置"}</p>
            </div>

            <form action={updateUserIdentityDisplayAction} className="mt-4 space-y-4">
              <input name="userId" type="hidden" value={user.id} />
              <input name="returnTo" type="hidden" value={currentDetailHref} />

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">精选勋章</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={user.profile?.featuredBadgeId ?? ""}
                  name="featuredBadgeId"
                >
                  <option value="">不展示精选勋章</option>
                  {grantedBadgeOptions.map((item) => (
                    <option key={item.id} value={item.badge.id}>
                      {item.badge.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">公开头衔</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={user.profile?.titleBadgeId ?? ""}
                  name="titleBadgeId"
                >
                  <option value="">不展示头衔</option>
                  {grantedTitleOptions.map((item) => (
                    <option key={item.id} value={item.badge.id}>
                      {item.badge.name}
                    </option>
                  ))}
                </select>
              </label>

              <Button type="submit">保存展示位</Button>
            </form>
          </SurfaceCard>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SurfaceCard className="overflow-hidden">
          <div className="border-b border-black/8 px-6 py-5">
            <p className="eyebrow">已授予身份</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前勋章与头衔</h3>
          </div>

          {user.userBadges.length === 0 ? (
            <div className="px-6 py-6 text-sm leading-7 text-slate-600">
              当前还没有授予任何勋章或头衔。
            </div>
          ) : (
            <div className="divide-y divide-black/6">
              {user.userBadges.map((item) => (
                <div className="grid gap-4 px-6 py-5 md:grid-cols-[160px_minmax(0,1fr)_180px_120px]" key={item.id}>
                  <div>
                    <span className="inline-flex rounded-full border border-black/10 bg-white/82 px-3 py-1 text-xs font-semibold text-slate-700">
                      {badgeKindLabel[item.badge.kind]}
                    </span>
                    <p className="mt-3 text-base font-semibold text-slate-950">{item.badge.name}</p>
                  </div>
                  <div className="text-sm leading-7 text-slate-600">
                    <p>{item.reason ?? item.badge.description ?? "暂无补充说明。"}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      授予人：{item.grantedBy?.profile?.nickname ?? item.grantedBy?.username ?? "系统或管理员"}
                    </p>
                  </div>
                  <div className="text-sm text-slate-500">
                    <p>授予时间：{formatDateTime(item.grantedAt)}</p>
                    <p className="mt-1">过期时间：{formatDateTime(item.expiresAt)}</p>
                  </div>
                  <div className="flex items-start justify-end">
                    <form action={removeUserBadgeAction}>
                      <input name="userId" type="hidden" value={user.id} />
                      <input name="userBadgeId" type="hidden" value={item.id} />
                      <input name="returnTo" type="hidden" value={currentDetailHref} />
                      <Button type="submit" variant="ghost">
                        移除
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="h-fit">
          <p className="eyebrow">人工授予</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">给当前用户追加身份标识</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            手工授予适合首版运营场景，后续如果要按条件自动发放，可以继续基于这套关系表扩展。
          </p>

          <form action={assignUserBadgeAction} className="mt-5 space-y-4">
            <input name="userId" type="hidden" value={user.id} />
            <input name="returnTo" type="hidden" value={currentDetailHref} />

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">选择勋章或头衔</span>
              <select
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                defaultValue=""
                disabled={availableBadgeOptions.length === 0}
                name="badgeId"
              >
                <option value="" disabled>
                  {availableBadgeOptions.length === 0 ? "当前没有可继续授予的身份配置" : "请选择一项身份配置"}
                </option>
                {availableBadgeOptions.map((badge) => (
                  <option key={badge.id} value={badge.id}>
                    {badgeKindLabel[badge.kind]} · {badge.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">授予原因</span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-[1.3rem] border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                defaultValue=""
                name="reason"
                placeholder="例如：连续组织活动、内容质量稳定、社区氛围建设突出。"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">过期日期</span>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                name="expiresAt"
                type="date"
              />
            </label>

            <Button disabled={availableBadgeOptions.length === 0} type="submit">
              授予身份
            </Button>
          </form>
        </SurfaceCard>
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
