import Link from "next/link";

import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import {
  adminReviewCommentAction,
  adminReviewPostAction
} from "@/modules/moderation/actions";
import {
  getModerationDashboardSummary,
  getPendingContentExcerpt,
  listPendingCommentsForAdmin,
  listPendingPostsForAdmin
} from "@/modules/moderation/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

type SearchParams = Promise<{
  q?: string;
  createdFrom?: string;
  createdTo?: string;
  result?: string;
  message?: string;
}>;

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "暂无记录";
  }

  return dateFormatter.format(value);
}

function sanitizeDateInput(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function buildReturnTo(input: {
  query?: string;
  createdFrom?: string;
  createdTo?: string;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.createdFrom) {
    params.set("createdFrom", input.createdFrom);
  }

  if (input.createdTo) {
    params.set("createdTo", input.createdTo);
  }

  const search = params.toString();

  return search ? `/admin/moderation/reviews?${search}` : "/admin/moderation/reviews";
}

function getFeedback(result?: string, message?: string) {
  if (result === "approved") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "审核已通过",
      message: message ?? "内容已经恢复为公开状态。"
    };
  }

  if (result === "rejected") {
    return {
      className: "border-rose-500/16 bg-rose-500/8 text-rose-900",
      title: "审核已拒绝",
      message: message ?? "内容不会进入公开列表，作者会收到站内提醒。"
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

export default async function AdminModerationReviewsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const createdFrom = sanitizeDateInput(params.createdFrom);
  const createdTo = sanitizeDateInput(params.createdTo);
  const [summary, posts, comments] = await Promise.all([
    getModerationDashboardSummary(),
    listPendingPostsForAdmin({
      query,
      createdFrom,
      createdTo,
      take: 6
    }),
    listPendingCommentsForAdmin({
      query,
      createdFrom,
      createdTo,
      take: 8
    })
  ]);
  const feedback = getFeedback(params.result, params.message);
  const returnTo = buildReturnTo({
    query,
    createdFrom,
    createdTo
  });

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "内容审核" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 内容审核</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">先把风险内容拦在队列里，再决定是否放行。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里统一处理新用户观察期内容和命中疑似风险词的帖子、评论。匿名内容在前台仍保持匿名，但后台会显示真实作者以便追溯。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/moderation/reports">查看举报处理</ButtonLink>
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
        <MetricCard accent="帖子" label="待审帖子" value={String(summary.pendingPostCount)} />
        <MetricCard accent="评论" label="待审评论" value={String(summary.pendingCommentCount)} />
        <MetricCard accent="举报" label="待处理举报" value={String(summary.pendingReportCount)} />
        <MetricCard accent="治理" label="受限账号" value={String(summary.mutedUserCount + summary.bannedUserCount)} />
      </div>

      <SurfaceCard>
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索内容</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="标题、内容、作者、圈子"
              type="search"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">进入队列起始日</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={createdFrom}
              name="createdFrom"
              type="date"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">进入队列结束日</span>
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
              刷新队列
            </button>
            <ButtonLink href="/admin/moderation/reviews" variant="ghost">
              清空条件
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <SurfaceCard className="grain-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">帖子队列</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">待审核帖子</h3>
              </div>
              <span className="rounded-full border border-black/8 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-600">
                当前 {posts.totalCount} 条
              </span>
            </div>

            {posts.items.length === 0 ? (
              <div className="mt-5 rounded-[1.15rem] border border-dashed border-black/10 bg-white/70 px-4 py-5 text-sm leading-7 text-slate-600">
                当前没有待审核帖子。
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {posts.items.map((post) => (
                  <div className="rounded-[1.35rem] border border-black/8 bg-white/82 p-5" key={post.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">{post.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          @{post.author.username} · {post.author.profile?.nickname ?? "未设置昵称"} · {post.circle.name}
                        </p>
                      </div>
                      <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800">
                        {formatDateTime(post.createdAt)}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-700">{getPendingContentExcerpt(post.contentHtml)}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{post.isAnonymous ? "匿名发帖" : "实名发帖"}</span>
                      <span>后台可追溯作者</span>
                      {post.reviewNote ? <span>自动送审原因：{post.reviewNote}</span> : null}
                    </div>

                    <form action={adminReviewPostAction} className="mt-5 space-y-3">
                      <input name="postId" type="hidden" value={post.id} />
                      <input name="returnTo" type="hidden" value={returnTo} />

                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">审核说明</span>
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-[1.2rem] border border-black/10 bg-white/90 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                          name="reviewNote"
                          placeholder="通过时可留内部说明；拒绝时请填写原因。"
                        />
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                          href={`/circles/${post.circle.slug}`}
                        >
                          查看圈子
                        </Link>
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
                          拒绝发布
                        </button>
                      </div>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <SurfaceCard className="grain-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">评论队列</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">待审核评论</h3>
            </div>
            <span className="rounded-full border border-black/8 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-600">
              当前 {comments.totalCount} 条
            </span>
          </div>

          {comments.items.length === 0 ? (
            <div className="mt-5 rounded-[1.15rem] border border-dashed border-black/10 bg-white/70 px-4 py-5 text-sm leading-7 text-slate-600">
              当前没有待审核评论。
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {comments.items.map((comment) => (
                <div className="rounded-[1.35rem] border border-black/8 bg-white/82 p-5" key={comment.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{comment.post.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        @{comment.author.username} · {comment.author.profile?.nickname ?? "未设置昵称"}
                      </p>
                    </div>
                    <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800">
                      {formatDateTime(comment.createdAt)}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-700">{getPendingContentExcerpt(comment.contentHtml)}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{comment.isAnonymous ? "匿名评论" : "实名评论"}</span>
                    <span>{comment.parentId ? "回复评论" : "主评论"}</span>
                    {comment.reviewNote ? <span>自动送审原因：{comment.reviewNote}</span> : null}
                  </div>

                  <form action={adminReviewCommentAction} className="mt-5 space-y-3">
                    <input name="commentId" type="hidden" value={comment.id} />
                    <input name="postPath" type="hidden" value={`/posts/${comment.postId}`} />
                    <input name="returnTo" type="hidden" value={returnTo} />

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">审核说明</span>
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-[1.2rem] border border-black/10 bg-white/90 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                        name="reviewNote"
                        placeholder="通过时可留内部说明；拒绝时请填写原因。"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                        href={`/posts/${comment.postId}#comment-${comment.id}`}
                      >
                        查看上下文
                      </Link>
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
                        拒绝发布
                      </button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
