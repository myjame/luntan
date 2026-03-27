import Link from "next/link";

import { ContentStatus } from "@/generated/prisma/client";
import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPagination } from "@/components/layout/admin-pagination";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import {
  adminDeletePostAction,
  adminTogglePostOperationAction
} from "@/modules/posts/admin-actions";
import {
  getAdminPostSummary,
  listPostsForAdmin
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

function buildAdminPostsHref(input: {
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

  return search ? `/admin/posts?${search}` : "/admin/posts";
}

function getFeedback(result?: string, message?: string) {
  if (result === "updated") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "运营状态已更新",
      message: message ?? "帖子运营动作已经生效。"
    };
  }

  if (result === "deleted") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "帖子已删除",
      message: message ?? "帖子已经从后台和公开流中移除。"
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

export default async function AdminPostsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = sanitizeStatus(params.status?.trim());
  const page = normalizePage(params.page);
  const [summary, posts] = await Promise.all([
    getAdminPostSummary(),
    listPostsForAdmin({
      query,
      status,
      page,
      take: 10
    })
  ]);
  const feedback = getFeedback(params.result, params.message);
  const returnTo = buildAdminPostsHref({
    query,
    status: status ?? "",
    page: posts.page
  });

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "帖子管理" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 帖子管理</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">帖子运营动作要收口到一处，首页流才能稳定。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里统一处理帖子置顶、精华、推荐和后台删帖。首版先把平台级运营动作和日志打通，再继续接首页运营位配置。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/moderation/reviews">查看内容审核</ButtonLink>
          <ButtonLink href="/admin/moderation/reports" variant="secondary">
            查看举报处理
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
        <MetricCard accent="内容" label="已发布帖子" value={String(summary.publishedCount)} />
        <MetricCard accent="置顶" label="置顶帖子" value={String(summary.pinnedCount)} />
        <MetricCard accent="精华" label="精华帖子" value={String(summary.featuredCount)} />
        <MetricCard accent="推荐" label="推荐帖子" value={String(summary.recommendedCount)} />
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索帖子</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="标题、摘要、作者、圈子"
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
            <ButtonLink href="/admin/posts" variant="ghost">
              清空条件
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      <div className="space-y-6">
        <div className="grid gap-5 xl:grid-cols-2">
          {posts.items.map((post) => {
            const statusMeta = contentStatusMeta[post.status];

            return (
              <SurfaceCard className="grain-panel h-full" key={post.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{post.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      @{post.author.username} · {post.author.profile?.nickname ?? "未设置昵称"} · {post.circle.name}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {stripHtml(post.excerpt ?? "").slice(0, 140) || "暂无摘要内容。"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  {post.isPinned ? (
                    <span className="rounded-full bg-[rgba(197,94,61,0.1)] px-3 py-1 text-[var(--color-accent)]">
                      已置顶
                    </span>
                  ) : null}
                  {post.isFeatured ? (
                    <span className="rounded-full bg-[rgba(23,107,108,0.1)] px-3 py-1 text-[var(--color-teal)]">
                      已精华
                    </span>
                  ) : null}
                  {post.isRecommended ? (
                    <span className="rounded-full bg-[rgba(181,138,56,0.12)] px-3 py-1 text-[var(--color-gold)]">
                      已推荐
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3 text-sm text-slate-600">
                    评论：{post.commentCount} · 点赞：{post.reactionCount}
                  </div>
                  <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3 text-sm text-slate-600">
                    收藏：{post.favoriteCount} · 发布时间：{formatDateTime(post.publishedAt ?? post.createdAt)}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {(["PIN", "FEATURE", "RECOMMEND"] as const).map((operation) => (
                    <form action={adminTogglePostOperationAction} key={operation}>
                      <input name="postId" type="hidden" value={post.id} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <input name="operation" type="hidden" value={operation} />
                      <button
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                        type="submit"
                      >
                        {operation === "PIN"
                          ? post.isPinned
                            ? "取消置顶"
                            : "置顶"
                          : operation === "FEATURE"
                            ? post.isFeatured
                              ? "取消精华"
                              : "设为精华"
                            : post.isRecommended
                              ? "取消推荐"
                              : "设为推荐"}
                      </button>
                    </form>
                  ))}
                </div>

                <form action={adminDeletePostAction} className="mt-5 space-y-3">
                  <input name="postId" type="hidden" value={post.id} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">后台删帖说明</span>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-[1.2rem] border border-black/10 bg-white/90 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                      name="reason"
                      placeholder="如需删除帖子，请填写处理说明。"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {post.status === ContentStatus.PUBLISHED ? (
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                        href={`/posts/${post.id}`}
                      >
                        查看前台
                      </Link>
                    ) : (
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                        href={`/circles/${post.circle.slug}`}
                      >
                        查看圈子
                      </Link>
                    )}
                    <button
                      className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"
                      type="submit"
                    >
                      后台删帖
                    </button>
                  </div>
                </form>
              </SurfaceCard>
            );
          })}
        </div>

        <AdminPagination
          hrefBuilder={(nextPage) =>
            buildAdminPostsHref({
              query,
              status: status ?? "",
              page: nextPage
            })
          }
          page={posts.page}
          pageSize={posts.pageSize}
          totalCount={posts.totalCount}
          totalPages={posts.totalPages}
        />
      </div>
    </div>
  );
}
