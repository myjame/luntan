import Link from "next/link";

import { ReportStatus, ReportTargetType } from "@/generated/prisma/client";
import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPagination } from "@/components/layout/admin-pagination";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import { adminResolveReportAction } from "@/modules/moderation/actions";
import {
  getModerationDashboardSummary,
  listReportsForAdmin
} from "@/modules/moderation/lib/service";
import {
  getReportTargetTypeLabel,
  getReportTypeLabel,
  governanceActionOptions,
  reportStatusMeta,
  reportTargetTypeOptions
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
  targetType?: string;
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

function sanitizeReportStatus(value?: string) {
  return value && Object.values(ReportStatus).includes(value as ReportStatus)
    ? (value as ReportStatus)
    : undefined;
}

function sanitizeReportTargetType(value?: string) {
  return value && Object.values(ReportTargetType).includes(value as ReportTargetType)
    ? (value as ReportTargetType)
    : undefined;
}

function buildReportListHref(input: {
  query?: string;
  status?: string;
  targetType?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.targetType) {
    params.set("targetType", input.targetType);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  const search = params.toString();

  return search ? `/admin/moderation/reports?${search}` : "/admin/moderation/reports";
}

function getFeedback(result?: string, message?: string) {
  if (result === "resolved") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "举报已处理",
      message: message ?? "处理结果已经写入治理日志。"
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

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = sanitizeReportStatus(params.status?.trim());
  const targetType = sanitizeReportTargetType(params.targetType?.trim());
  const page = normalizePage(params.page);
  const [summary, reports] = await Promise.all([
    getModerationDashboardSummary(),
    listReportsForAdmin({
      query,
      status,
      targetType,
      page,
      take: 12
    })
  ]);
  const feedback = getFeedback(params.result, params.message);
  const returnTo = buildReportListHref({
    query,
    status: status ?? "",
    targetType: targetType ?? "",
    page: reports.page
  });

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "举报处理" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 举报处理</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">举报不是终点，关键是把动作闭环做完整。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里承接帖子、评论、用户等举报。首版支持直接结案、删帖删评、禁言和封号，并同步写入治理动作与操作日志。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/moderation/reviews">处理内容审核</ButtonLink>
          <ButtonLink href="/admin/moderation/users" variant="secondary">
            查看治理用户
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
        <MetricCard accent="帖子" label="待审帖子" value={String(summary.pendingPostCount)} />
        <MetricCard accent="评论" label="待审评论" value={String(summary.pendingCommentCount)} />
        <MetricCard accent="举报" label="待处理举报" value={String(summary.pendingReportCount)} />
        <MetricCard accent="风控" label="封禁账号" value={String(summary.bannedUserCount)} />
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索举报</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="举报说明、举报人"
              type="search"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">处理状态</span>
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={status ?? ""}
              name="status"
            >
              <option value="">全部状态</option>
              {Object.entries(reportStatusMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">目标类型</span>
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={targetType ?? ""}
              name="targetType"
            >
              <option value="">全部目标</option>
              {reportTargetTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
              type="submit"
            >
              刷新列表
            </button>
            <ButtonLink href="/admin/moderation/reports" variant="ghost">
              清空条件
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      {reports.items.length === 0 ? (
        <SurfaceCard className="grain-panel">
          <p className="eyebrow">举报队列</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前没有符合条件的举报</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            队列为空时，可以继续查看内容审核或治理用户列表。
          </p>
        </SurfaceCard>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 xl:grid-cols-2">
            {reports.items.map((report) => {
              const statusMeta = reportStatusMeta[report.status];

              return (
                <SurfaceCard className="grain-panel h-full" key={report.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {getReportTypeLabel(report.reportType)} · {getReportTargetTypeLabel(report.targetType)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        举报人：@{report.reporter.username} · {report.reporter.profile?.nickname ?? "未设置昵称"}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-5 rounded-[1.15rem] border border-black/8 bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">举报目标</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{report.targetLabel}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {report.detail || "举报人未补充详细说明。"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>提交时间：{formatDateTime(report.createdAt)}</span>
                      {report.resolvedAt ? <span>处理时间：{formatDateTime(report.resolvedAt)}</span> : null}
                    </div>
                  </div>

                  <form action={adminResolveReportAction} className="mt-5 space-y-3">
                    <input name="reportId" type="hidden" value={report.id} />
                    <input name="returnTo" type="hidden" value={returnTo} />
                    <input name="targetPath" type="hidden" value={report.targetHref ?? ""} />

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">处理动作</span>
                      <select
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                        defaultValue="RESOLVE_ONLY"
                        name="action"
                      >
                        {governanceActionOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">处理说明</span>
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-[1.2rem] border border-black/10 bg-white/90 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                        defaultValue={report.resolutionNote ?? ""}
                        name="resolutionNote"
                        placeholder="执行治理动作时请填写说明。"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      {report.targetHref ? (
                        <Link
                          className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                          href={report.targetHref}
                        >
                          查看目标
                        </Link>
                      ) : null}
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
                        type="submit"
                      >
                        提交处理
                      </button>
                    </div>
                  </form>
                </SurfaceCard>
              );
            })}
          </div>

          <AdminPagination
            hrefBuilder={(nextPage) =>
              buildReportListHref({
                query,
                status: status ?? "",
                targetType: targetType ?? "",
                page: nextPage
              })
            }
            page={reports.page}
            pageSize={reports.pageSize}
            totalCount={reports.totalCount}
            totalPages={reports.totalPages}
          />
        </div>
      )}
    </div>
  );
}
