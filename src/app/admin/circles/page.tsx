import { CircleStatus } from "@/generated/prisma/client";
import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPagination } from "@/components/layout/admin-pagination";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import {
  circleStatusOptions,
  getCircleReviewSummary,
  getCircleStatusMeta,
  listCircleCategories,
  listCirclesForAdmin
} from "@/modules/community/lib/service";

type SearchParams = Promise<{
  q?: string;
  category?: string;
  status?: string;
  page?: string;
}>;

const validStatuses = new Set<CircleStatus>(Object.values(CircleStatus));

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

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

function buildAdminCirclesHref(input: {
  query?: string;
  categorySlug?: string;
  status?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.categorySlug) {
    params.set("category", input.categorySlug);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  const search = params.toString();

  return search ? `/admin/circles?${search}` : "/admin/circles";
}

export default async function AdminCirclesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const categorySlug = params.category?.trim() ?? "";
  const rawStatus = params.status?.trim() ?? "";
  const selectedStatus = validStatuses.has(rawStatus as CircleStatus)
    ? (rawStatus as CircleStatus)
    : undefined;
  const page = normalizePage(params.page);
  const [summary, categories, circles] = await Promise.all([
    getCircleReviewSummary(),
    listCircleCategories(),
    listCirclesForAdmin({
      query,
      categorySlug,
      status: selectedStatus,
      page,
      take: 10
    })
  ]);

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "圈子管理" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 圈子管理</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">统一看圈子状态、圈主归属和上线节奏。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里先承接后台的圈子总表。可以查看圈子状态、分类、关注量和圈主信息，并跳转到前台详情或圈主管理页。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/circles/reviews">处理圈子审核</ButtonLink>
          <ButtonLink href="/circles" variant="secondary">
            查看前台圈子页
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="待办" label="待审核申请" value={String(summary.pendingApplicationCount)} />
        <MetricCard accent="上线" label="已上线圈子" value={String(summary.activeCircleCount)} />
        <MetricCard accent="通过" label="已通过申请" value={String(summary.approvedApplicationCount)} />
        <MetricCard accent="退回" label="已拒绝申请" value={String(summary.rejectedApplicationCount)} />
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索圈子</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="圈子名称、slug、简介"
              type="search"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">分类筛选</span>
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={categorySlug}
              name="category"
            >
              <option value="">全部分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">状态筛选</span>
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={selectedStatus ?? ""}
              name="status"
            >
              <option value="">全部状态</option>
              {circleStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
              type="submit"
            >
              应用筛选
            </button>
            <ButtonLink href="/admin/circles" variant="ghost">
              重置
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">圈子总表</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前圈子与管理信息</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              这里统一承接圈子查询入口；圈主管理页已经接通圈内置顶、删帖、禁言和举报处理等基础治理动作。
            </p>
          </div>
          <div className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700">
            当前结果：{circles.totalCount}
          </div>
        </div>

        {circles.items.length === 0 ? (
          <div className="mt-6 rounded-[1.35rem] border border-dashed border-black/10 bg-white/70 px-5 py-6 text-sm leading-7 text-slate-600">
            没有匹配到圈子，可以调整搜索词或筛选条件后再试。
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="overflow-hidden rounded-[1.4rem] border border-black/8 bg-white/72">
              <div className="hidden grid-cols-[minmax(0,1.3fr)_180px_180px_minmax(0,1fr)_160px] gap-4 border-b border-black/8 px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 lg:grid">
                <div>圈子信息</div>
                <div>状态</div>
                <div>分类与圈主</div>
                <div>运营数据</div>
                <div className="text-right">操作</div>
              </div>

              <div>
                {circles.items.map((circle) => {
                  const statusMeta = getCircleStatusMeta(circle.status);
                  const managerCount = circle.managers.filter((item) => item.role === "MANAGER").length;
                  const ownerName =
                    circle.owner?.profile?.nickname ?? circle.owner?.username ?? "暂未分配圈主";

                  return (
                    <div
                      className="grid gap-4 border-t border-black/6 px-5 py-5 first:border-t-0 lg:grid-cols-[minmax(0,1.3fr)_180px_180px_minmax(0,1fr)_160px]"
                      key={circle.id}
                    >
                      <div>
                        <p className="text-base font-semibold text-slate-950">{circle.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{circle.slug}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{circle.intro ?? "暂无圈子简介。"}</p>
                      </div>

                      <div className="space-y-2">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                        <p className="text-sm text-slate-500">创建于 {formatDateTime(circle.createdAt)}</p>
                        <p className="text-sm text-slate-500">更新于 {formatDateTime(circle.updatedAt)}</p>
                      </div>

                      <div className="space-y-2 text-sm leading-6 text-slate-600">
                        <p>分类：{circle.category.name}</p>
                        <p>圈主：{ownerName}</p>
                        <p>圈管：{managerCount} 人</p>
                      </div>

                      <div className="space-y-2 text-sm leading-6 text-slate-600">
                        <p>关注：{circle.followersCount}</p>
                        <p>帖子：{circle.postsCount}</p>
                        <p>{circle.allowAnonymous ? "已开启匿名发言" : "匿名发言关闭"}</p>
                      </div>

                      <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
                        <ButtonLink href={`/circles/${circle.slug}`} variant="secondary">
                          前台详情
                        </ButtonLink>
                        <ButtonLink href={`/circles/${circle.slug}/manage`}>管理页</ButtonLink>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <AdminPagination
              hrefBuilder={(nextPage) =>
                buildAdminCirclesHref({
                  query,
                  categorySlug,
                  status: selectedStatus,
                  page: nextPage
                })
              }
              page={circles.page}
              pageSize={circles.pageSize}
              totalCount={circles.totalCount}
              totalPages={circles.totalPages}
            />
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
