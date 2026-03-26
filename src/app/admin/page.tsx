import Link from "next/link";

import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { ListCard, MetricCard, SurfaceCard } from "@/components/ui/card";
import { listPendingRegistrationUsers, getAdminDashboardStats } from "@/modules/auth/lib/admin";

const queues: Array<{
  title: string;
  body: string;
  href: string;
  actionLabel: string;
}> = [
  {
    title: "注册审核队列",
    body: "处理 pending_review 用户，审核结果会立刻影响账号登录能力。",
    href: "/admin/users/reviews",
    actionLabel: "进入用户审核"
  },
  {
    title: "用户管理面板",
    body: "统一查看账号状态、角色、最后登录时间和历史审核结果，为后续治理动作提供入口。",
    href: "/admin/users",
    actionLabel: "查看用户管理"
  },
  {
    title: "管理员工具位",
    body: "首版先提供密码重置工具，后续继续补内容审核、圈子审核与治理日志。",
    href: "/admin/password-reset",
    actionLabel: "打开工具页"
  }
];

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function formatDateTime(value: Date) {
  return dateFormatter.format(value);
}

export default async function AdminPage() {
  const [stats, pendingUserResult] = await Promise.all([
    getAdminDashboardStats(),
    listPendingRegistrationUsers({ take: 4 })
  ]);
  const pendingUsers = pendingUserResult.items;

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs items={[{ label: "后台首页" }]} />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台总览</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">先把治理链路做厚，再把社区放开。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          后台首页已经接入真实统计和待审账号预览，接下来可以直接沿着用户审核、用户管理、圈子系统的顺序继续推进。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/users/reviews">进入用户审核</ButtonLink>
          <ButtonLink href="/admin/users" variant="secondary">
            查看用户管理
          </ButtonLink>
          <ButtonLink href="/admin/password-reset" variant="ghost">
            管理员工具
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="账号" label="待审用户" value={String(stats.pendingUserCount)} />
        <MetricCard accent="内容" label="待审内容" value={String(stats.pendingContentCount)} />
        <MetricCard accent="举报" label="待处理举报" value={String(stats.pendingReportCount)} />
        <MetricCard accent="社区" label="已激活用户" value={String(stats.activeUserCount)} />
      </div>

      <div className="dashboard-grid">
        <SurfaceCard className="grain-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">待审预览</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">最近进入队列的注册申请</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                审核页已经可直接执行通过和拒绝操作，首页保留一个轻量预览，用来快速感知后台节奏。
              </p>
            </div>
            <ButtonLink className="whitespace-nowrap" href="/admin/users/reviews" variant="secondary">
              处理全部申请
            </ButtonLink>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-white/70 px-5 py-6 text-sm leading-7 text-slate-600">
              当前没有新的待审注册申请，可以继续完善圈子、内容和治理模块。
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {pendingUsers.map((user) => (
                <div
                  className="rounded-[1.35rem] border border-black/8 bg-white/78 px-5 py-4"
                  key={user.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-950">
                        {user.profile?.nickname ?? user.username}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        @{user.username} · {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        className="rounded-full border border-black/8 bg-white/88 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5"
                        href={`/admin/users/${user.id}?returnTo=${encodeURIComponent("/admin")}&from=dashboard`}
                      >
                        查看资料
                      </Link>
                      <div className="rounded-full border border-black/8 bg-[rgba(197,94,61,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                        {formatDateTime(user.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <div className="grid gap-5">
          {queues.map((item) => (
            <ListCard
              body={item.body}
              eyebrow="关键入口"
              footer={
                <Link className="text-sm font-semibold text-[var(--color-accent)]" href={item.href}>
                  {item.actionLabel}
                </Link>
              }
              key={item.title}
              title={item.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
