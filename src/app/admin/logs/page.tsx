import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPagination } from "@/components/layout/admin-pagination";
import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { getAuditLogPreview, listAuditLogsForAdmin } from "@/modules/moderation/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

type SearchParams = Promise<{
  q?: string;
  action?: string;
  entityType?: string;
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

function buildLogHref(input: {
  query?: string;
  action?: string;
  entityType?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.action) {
    params.set("action", input.action);
  }

  if (input.entityType) {
    params.set("entityType", input.entityType);
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

  return search ? `/admin/logs?${search}` : "/admin/logs";
}

export default async function AdminLogsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const action = params.action?.trim() ?? "";
  const entityType = params.entityType?.trim() ?? "";
  const createdFrom = sanitizeDateInput(params.createdFrom);
  const createdTo = sanitizeDateInput(params.createdTo);
  const page = normalizePage(params.page);
  const logs = await listAuditLogsForAdmin({
    query,
    action,
    entityType,
    createdFrom,
    createdTo,
    page,
    take: 20
  });

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "操作日志" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 操作日志</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">关键动作都得留下痕迹，后续排查才有抓手。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里集中查看审核、举报处理、治理用户和个人屏蔽等关键动作。首版先支持按动作、实体类型、时间范围和操作人关键词筛选。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/moderation/reports">返回举报处理</ButtonLink>
          <ButtonLink href="/admin/moderation/sensitive-words" variant="secondary">
            查看敏感词
          </ButtonLink>
        </div>
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_200px_180px_180px_180px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索日志</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="动作、实体、操作人"
              type="search"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">动作名</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={action}
              name="action"
              placeholder="如 handle_report"
              type="text"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">实体类型</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={entityType}
              name="entityType"
              placeholder="如 post"
              type="text"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">开始日期</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={createdFrom}
              name="createdFrom"
              type="date"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">结束日期</span>
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
              搜索日志
            </button>
            <ButtonLink href="/admin/logs" variant="ghost">
              清空条件
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-black/8 px-6 py-5">
          <p className="eyebrow">日志列表</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">最近的后台动作</h3>
        </div>

        {logs.items.length === 0 ? (
          <div className="px-6 py-6 text-sm leading-7 text-slate-600">当前没有符合条件的操作日志。</div>
        ) : (
          <div className="divide-y divide-black/6">
            {logs.items.map((item) => (
              <div className="grid gap-4 px-6 py-5 lg:grid-cols-[220px_180px_minmax(0,1fr)_180px]" key={item.id}>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.action}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.entityType}{item.entityId ? ` · ${item.entityId}` : ""}</p>
                </div>
                <div className="text-sm text-slate-600">
                  {item.actor ? `@${item.actor.username}` : "系统动作"}
                  <p className="mt-1 text-xs text-slate-500">{item.actor?.profile?.nickname ?? "未设置昵称"}</p>
                </div>
                <div className="text-sm leading-7 text-slate-600">{getAuditLogPreview(item.payloadJson)}</div>
                <div className="text-sm text-slate-500">{formatDateTime(item.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      <AdminPagination
        hrefBuilder={(nextPage) =>
          buildLogHref({
            query,
            action,
            entityType,
            createdFrom,
            createdTo,
            page: nextPage
          })
        }
        page={logs.page}
        pageSize={logs.pageSize}
        totalCount={logs.totalCount}
        totalPages={logs.totalPages}
      />
    </div>
  );
}
