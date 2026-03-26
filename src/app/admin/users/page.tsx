import Link from "next/link";

import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPagination } from "@/components/layout/admin-pagination";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import {
  adminUserRoleOptions,
  adminUserStatusOptions,
  getAdminUserDirectorySummary,
  getAdminUserRoleMeta,
  getAdminUserStatusMeta,
  getReviewedByLabel,
  listUsersForAdmin
} from "@/modules/auth/lib/admin";
import { authUserRoles, authUserStatuses, type AuthUserRole, type AuthUserStatus } from "@/modules/auth/lib/types";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const validStatuses = new Set<string>(authUserStatuses);
const validRoles = new Set<string>(authUserRoles);

type SearchParams = Promise<{
  q?: string;
  status?: string;
  role?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: string;
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

function buildUserListHref(input: {
  query?: string;
  status?: string;
  role?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.role) {
    params.set("role", input.role);
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

  return search ? `/admin/users?${search}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const selectedStatus = validStatuses.has(params.status ?? "")
    ? (params.status as AuthUserStatus)
    : undefined;
  const selectedRole = validRoles.has(params.role ?? "") ? (params.role as AuthUserRole) : undefined;
  const createdFrom = sanitizeDateInput(params.createdFrom);
  const createdTo = sanitizeDateInput(params.createdTo);
  const page = normalizePage(params.page);
  const [users, summary] = await Promise.all([
    listUsersForAdmin({
      query,
      createdFrom,
      createdTo,
      status: selectedStatus,
      role: selectedRole,
      page,
      take: 40
    }),
    getAdminUserDirectorySummary()
  ]);

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "用户管理" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 用户管理</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">统一看账号状态，再把后续治理入口接进来。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这一页先提供后台统一查询与筛选能力，覆盖状态、角色、审核结果和最后登录时间，后续可以继续挂禁言、封禁、注销审核等动作。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/users/reviews">返回用户审核</ButtonLink>
          <ButtonLink href="/admin/password-reset" variant="secondary">
            管理员工具
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="全量" label="总用户数" value={String(summary.totalUserCount)} />
        <MetricCard accent="通过" label="已激活" value={String(summary.activeUserCount)} />
        <MetricCard accent="待办" label="待审核" value={String(summary.pendingReviewCount)} />
        <MetricCard accent="治理" label="受限账号" value={String(summary.restrictedUserCount)} />
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_220px_220px_220px_220px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索账号</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="用户名、邮箱、昵称"
              type="search"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">状态筛选</span>
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={selectedStatus ?? ""}
              name="status"
            >
              <option value="">全部状态</option>
              {adminUserStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">角色筛选</span>
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={selectedRole ?? ""}
              name="role"
            >
              <option value="">全部角色</option>
              {adminUserRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
              应用筛选
            </button>
            <ButtonLink href="/admin/users" variant="ghost">
              重置
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">账号列表</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">最近用户与审核结果</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">当前最多展示最近 40 条记录，便于先把后台基础查询与管理流程搭起来。</p>
          </div>
          <div className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700">
            当前结果：{users.totalCount}
          </div>
        </div>

        {users.items.length === 0 ? (
          <div className="mt-6 rounded-[1.35rem] border border-dashed border-black/10 bg-white/70 px-5 py-6 text-sm leading-7 text-slate-600">
            没有匹配到符合条件的账号，可以调整搜索词或筛选条件后再试。
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="overflow-hidden rounded-[1.4rem] border border-black/8 bg-white/72">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_180px_180px_minmax(0,1fr)_120px] gap-4 border-b border-black/8 px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 lg:grid">
                <div>账号信息</div>
                <div>状态</div>
                <div>角色</div>
                <div>审核与登录</div>
                <div className="text-right">操作</div>
              </div>

              <div>
                {users.items.map((user) => {
                  const statusMeta = getAdminUserStatusMeta(user.status);
                  const roleMeta = getAdminUserRoleMeta(user.role);
                  const reviewedBy = getReviewedByLabel(user);
                  const detailHref = `/admin/users/${user.id}?returnTo=${encodeURIComponent(
                    buildUserListHref({
                      query,
                      status: selectedStatus,
                      role: selectedRole,
                      createdFrom,
                      createdTo,
                      page: users.page
                    })
                  )}`;

                  return (
                    <div
                      className="grid gap-4 border-t border-black/6 px-5 py-5 first:border-t-0 lg:grid-cols-[minmax(0,1.4fr)_180px_180px_minmax(0,1fr)_120px]"
                      key={user.id}
                    >
                      <div>
                        <p className="text-base font-semibold text-slate-950">{user.profile?.nickname ?? user.username}</p>
                        <p className="mt-1 text-sm text-slate-500">@{user.username}</p>
                        <p className="mt-2 text-sm text-slate-700">{user.email}</p>
                        {user.profile?.bio ? (
                          <p className="mt-2 text-sm leading-6 text-slate-500">{user.profile.bio}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                        <p className="text-sm text-slate-500">注册于 {formatDateTime(user.createdAt)}</p>
                        {user.deletionRequestedAt ? (
                          <p className="text-sm text-slate-500">注销申请于 {formatDateTime(user.deletionRequestedAt)}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${roleMeta.className}`}
                        >
                          {roleMeta.label}
                        </span>
                        <p className="text-sm text-slate-500">最后登录 {formatDateTime(user.lastLoginAt)}</p>
                      </div>

                      <div className="space-y-2 text-sm leading-6 text-slate-600">
                        {user.reviewedAt ? (
                          <>
                            <p>审核时间：{formatDateTime(user.reviewedAt)}</p>
                            <p>审核人：{reviewedBy ?? "管理员"}</p>
                          </>
                        ) : (
                          <p>尚未进入已完成审核状态。</p>
                        )}
                        {user.reviewNote ? <p>备注：{user.reviewNote}</p> : null}
                      </div>

                      <div className="flex items-start justify-start lg:justify-end">
                        <Link
                          className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                          href={detailHref}
                        >
                          查看
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildUserListHref({
                  query,
                  status: selectedStatus,
                  role: selectedRole,
                  createdFrom,
                  createdTo,
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
      </SurfaceCard>
    </div>
  );
}
