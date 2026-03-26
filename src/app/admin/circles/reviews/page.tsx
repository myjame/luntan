import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPagination } from "@/components/layout/admin-pagination";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import { adminReviewCircleApplicationAction } from "@/modules/community/actions";
import {
  getCircleReviewSummary,
  getWorkflowStatusMeta,
  listCircleCategories,
  listPendingCircleApplications
} from "@/modules/community/lib/service";

type SearchParams = Promise<{
  q?: string;
  category?: string;
  page?: string;
  result?: string;
  message?: string;
}>;

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

function buildReviewHref(input: { query?: string; categorySlug?: string; page?: number }) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.categorySlug) {
    params.set("category", input.categorySlug);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  const search = params.toString();

  return search ? `/admin/circles/reviews?${search}` : "/admin/circles/reviews";
}

function getFeedback(result?: string, message?: string) {
  if (result === "approved") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "审核已通过",
      message: message ?? "圈子已创建并上线。"
    };
  }

  if (result === "rejected") {
    return {
      className: "border-rose-500/16 bg-rose-500/8 text-rose-900",
      title: "审核已拒绝",
      message: message ?? "圈子申请已被退回。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "审核未完成",
      message: message ?? "请检查后重新提交。"
    };
  }

  return null;
}

export default async function AdminCircleReviewsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const categorySlug = params.category?.trim() ?? "";
  const page = normalizePage(params.page);
  const [summary, categories, applications] = await Promise.all([
    getCircleReviewSummary(),
    listCircleCategories(),
    listPendingCircleApplications({
      query,
      categorySlug,
      page,
      take: 8
    })
  ]);
  const feedback = getFeedback(params.result, params.message);
  const returnTo = buildReviewHref({
    query,
    categorySlug,
    page: applications.page
  });

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "圈子审核" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 圈子审核</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">先把圈子申请收口，再让内容沉淀稳定生长。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          圈子申请通过后会自动生成圈子，把申请人设为圈主并加入圈管关系。首版先把申请审核、上线和基础管理权交接打通。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/circles">查看圈子管理</ButtonLink>
          <ButtonLink href="/circles" variant="secondary">
            打开前台圈子页
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
        <MetricCard accent="待办" label="待审核申请" value={String(summary.pendingApplicationCount)} />
        <MetricCard accent="通过" label="已通过申请" value={String(summary.approvedApplicationCount)} />
        <MetricCard accent="退回" label="已拒绝申请" value={String(summary.rejectedApplicationCount)} />
        <MetricCard accent="上线" label="已上线圈子" value={String(summary.activeCircleCount)} />
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索圈子申请</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="圈子名称、slug、申请人"
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

          <div className="flex items-end gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
              type="submit"
            >
              筛选申请
            </button>
            <ButtonLink href="/admin/circles/reviews" variant="ghost">
              重置
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      {applications.items.length === 0 ? (
        <SurfaceCard className="grain-panel">
          <p className="eyebrow">审核队列</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前没有待审核圈子申请</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            队列已经清空。可以转去圈子管理页查看已上线圈子，或者继续推进帖子与治理模块。
          </p>
        </SurfaceCard>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 xl:grid-cols-2">
            {applications.items.map((application) => {
              const statusMeta = getWorkflowStatusMeta(application.status);
              const applicantName =
                application.applicant.profile?.nickname ?? application.applicant.username;

              return (
                <SurfaceCard className="grain-panel h-full" key={application.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-slate-950">{application.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {application.category.name} · {application.slug}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">申请人</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">{applicantName}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">提交时间</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">{formatDateTime(application.createdAt)}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-4 text-sm leading-7 text-slate-600">
                    <p>简介：{application.intro}</p>
                    <p>圈规：{application.rules}</p>
                    <p>{application.allowAnonymous ? "申请开启匿名发言" : "申请关闭匿名发言"}</p>
                    {application.applicant.profile?.bio ? <p>申请人简介：{application.applicant.profile.bio}</p> : null}
                  </div>

                  <form action={adminReviewCircleApplicationAction} className="mt-5 space-y-4">
                    <input name="applicationId" type="hidden" value={application.id} />
                    <input name="returnTo" type="hidden" value={returnTo} />

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">审核说明</span>
                      <textarea
                        className="mt-2 min-h-28 w-full rounded-[1.4rem] border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                        defaultValue=""
                        name="reviewNote"
                        placeholder="通过时可补充说明；拒绝时请写明原因。"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
                        name="decision"
                        type="submit"
                        value="APPROVE"
                      >
                        通过并上线
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"
                        name="decision"
                        type="submit"
                        value="REJECT"
                      >
                        拒绝申请
                      </button>
                    </div>
                  </form>
                </SurfaceCard>
              );
            })}
          </div>

          <AdminPagination
            hrefBuilder={(nextPage) =>
              buildReviewHref({
                query,
                categorySlug,
                page: nextPage
              })
            }
            page={applications.page}
            pageSize={applications.pageSize}
            totalCount={applications.totalCount}
            totalPages={applications.totalPages}
          />
        </div>
      )}
    </div>
  );
}
