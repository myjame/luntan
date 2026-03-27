import Link from "next/link";

import { ContentStatus } from "@/generated/prisma/client";
import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPagination } from "@/components/layout/admin-pagination";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import {
  adminDeleteCommentAction
} from "@/modules/posts/admin-actions";
import {
  getAdminCommentSummary,
  listCommentsForAdmin
} from "@/modules/posts/lib/admin";

const contentStatusMeta: Record<
  ContentStatus,
  {
    label: string;
    className: string;
  }
> = {
  [ContentStatus.PUBLISHED]: {
    label: "已发布",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
  },
  [ContentStatus.PENDING_REVIEW]: {
    label: "待审核",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-800"
  },
  [ContentStatus.REJECTED]: {
    label: "已拒绝",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-800"
  },
  [ContentStatus.DELETED]: {
    label: "已删除",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-700"
  },
  [ContentStatus.BLOCKED]: {
    label: "已拦截",
    className: "border-stone-500/20 bg-stone-500/10 text-stone-700"
  }
};

const adminContentStatusOptions = [
  { value: "", label: "全部状态" },
  { value: ContentStatus.PUBLISHED, label: "已发布" },
  { value: ContentStatus.PENDING_REVIEW, label: "待审核" },
  { value: ContentStatus.REJECTED, label: "已拒绝" },
  { value: ContentStatus.DELETED, label: "已删除" }
] as const;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
  result?: string;
  message?: string;
}>;

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

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

function sanitizeStatus(value?: string) {
  return value && Object.values(ContentStatus).includes(value as ContentStatus)
    ? (value as ContentStatus)
    : undefined;
}

function buildAdminCommentsHref(input: {
  query?: string;
  status?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  const search = params.toString();

  return search ? `/admin/comments?${search}` : "/admin/comments";
}

function getFeedback(result?: string, message?: string) {
  if (result === "deleted") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "评论已删除",
      message: message ?? "评论已经从后台和公开链路中移除。"
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

export default async function AdminCommentsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = sanitizeStatus(params.status?.trim());
  const page = normalizePage(params.page);
  const [summary, comments] = await Promise.all([
    getAdminCommentSummary(),
    listCommentsForAdmin({
      query,
      status,
      page,
      take: 12
    })
  ]);
  const feedback = getFeedback(params.result, params.message);
  const returnTo = buildAdminCommentsHref({
    query,
    status: status ?? "",
    page: comments.page
  });

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "评论管理" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 评论管理</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">评论治理要兼顾上下文，删评动作也要有日志。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里用于查看评论状态、上下文归属和匿名情况，并执行管理员删评。首版先把平台级删评与日志打通，后续再补更细的评论运营工具。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/moderation/reviews">查看评论审核</ButtonLink>
          <ButtonLink href="/admin/logs" variant="secondary">
            查看操作日志
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
        <MetricCard accent="公开" label="已发布评论" value={String(summary.publishedCount)} />
        <MetricCard accent="审核" label="待审评论" value={String(summary.pendingCount)} />
        <MetricCard accent="匿名" label="匿名评论" value={String(summary.anonymousCount)} />
        <MetricCard accent="移除" label="已删评论" value={String(summary.deletedCount)} />
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索评论</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="内容、作者、帖子标题"
              type="search"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">状态筛选</span>
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={status ?? ""}
              name="status"
            >
              {adminContentStatusOptions.map((option) => (
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
              刷新列表
            </button>
            <ButtonLink href="/admin/comments" variant="ghost">
              清空条件
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      <div className="space-y-6">
        <div className="grid gap-5 xl:grid-cols-2">
          {comments.items.map((comment) => {
            const statusMeta = contentStatusMeta[comment.status];

            return (
              <SurfaceCard className="grain-panel h-full" key={comment.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{comment.post.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      @{comment.author.username} · {comment.author.profile?.nickname ?? "未设置昵称"} · {comment.post.circle.name}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {stripHtml(comment.contentHtml).slice(0, 180) || "暂无评论内容。"}
                </p>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{comment.isAnonymous ? "匿名评论" : "实名评论"}</span>
                  <span>{comment.parentId ? "回复评论" : "主评论"}</span>
                  <span>发布时间：{formatDateTime(comment.createdAt)}</span>
                </div>

                <form action={adminDeleteCommentAction} className="mt-5 space-y-3">
                  <input name="commentId" type="hidden" value={comment.id} />
                  <input name="postId" type="hidden" value={comment.postId} />
                  <input name="returnTo" type="hidden" value={returnTo} />

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">删评说明</span>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-[1.2rem] border border-black/10 bg-white/90 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                      name="reason"
                      placeholder="如需后台删评，请填写处理说明。"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    {comment.status === ContentStatus.PUBLISHED ? (
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                        href={`/posts/${comment.postId}#comment-${comment.id}`}
                      >
                        查看前台
                      </Link>
                    ) : (
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                        href={`/posts/${comment.postId}`}
                      >
                        查看帖子
                      </Link>
                    )}
                    <button
                      className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"
                      type="submit"
                    >
                      后台删评
                    </button>
                  </div>
                </form>
              </SurfaceCard>
            );
          })}
        </div>

        <AdminPagination
          hrefBuilder={(nextPage) =>
            buildAdminCommentsHref({
              query,
              status: status ?? "",
              page: nextPage
            })
          }
          page={comments.page}
          pageSize={comments.pageSize}
          totalCount={comments.totalCount}
          totalPages={comments.totalPages}
        />
      </div>
    </div>
  );
}
