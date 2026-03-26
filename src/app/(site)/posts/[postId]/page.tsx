import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import { deletePostAction } from "@/modules/posts/actions";
import { getPostTypeMeta } from "@/modules/posts/lib/constants";
import { getPublicPostDetail } from "@/modules/posts/lib/service";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

type PageParams = Promise<{
  postId: string;
}>;

type SearchParams = Promise<{
  result?: string;
  message?: string;
}>;

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "暂无记录";
  }

  return dateFormatter.format(value);
}

function getFeedback(result?: string, message?: string) {
  if (result === "created") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "帖子已发布",
      message: message ?? "内容已经进入帖子流。"
    };
  }

  if (result === "updated") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "帖子已更新",
      message: message ?? "修改后的内容已经生效。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "操作未完成",
      message: message ?? "请稍后再试。"
    };
  }

  return null;
}

function getAuthorText(input: {
  isAnonymous: boolean;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  authorId: string;
  authorName: string;
}) {
  if (!input.isAnonymous) {
    return {
      label: input.authorName,
      note: null
    };
  }

  if (input.currentUserRole === "SUPER_ADMIN") {
    return {
      label: "匿名用户",
      note: `实际作者：${input.authorName}`
    };
  }

  if (input.currentUserId === input.authorId) {
    return {
      label: "匿名发布（你）",
      note: null
    };
  }

  return {
    label: "匿名用户",
    note: null
  };
}

export default async function PostDetailPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const [{ postId }, query, currentUser] = await Promise.all([
    params,
    searchParams,
    getCurrentUser()
  ]);
  const detail = await getPublicPostDetail(postId, currentUser?.id, currentUser?.role);

  if (!detail) {
    notFound();
  }

  const feedback = getFeedback(query.result, query.message);
  const activeUser = currentUser?.status === "ACTIVE" ? currentUser : null;
  const postTypeMeta = getPostTypeMeta(detail.post.postType);
  const authorName =
    detail.post.author.profile?.nickname ?? detail.post.author.username;
  const author = getAuthorText({
    isAnonymous: detail.post.isAnonymous,
    currentUserId: currentUser?.id,
    currentUserRole: currentUser?.role,
    authorId: detail.post.author.id,
    authorName
  });
  const deleteReturnTo = `/circles/${detail.post.circle.slug}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(135deg,rgba(255,251,247,0.96),rgba(246,236,226,0.88))] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
                href={`/circles/${detail.post.circle.slug}`}
              >
                {detail.post.circle.name}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-slate-900">帖子详情</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${postTypeMeta.className}`}>
                {postTypeMeta.label}
              </span>
              {detail.post.isPinned ? (
                <span className="rounded-full border border-black/8 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                  置顶内容
                </span>
              ) : null}
              {detail.post.poll ? (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {detail.post.poll.allowMultiple ? "多选投票" : "单选投票"}
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">
              {detail.post.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm leading-7 text-slate-500">
              <span>作者：{author.label}</span>
              {author.note ? <span>{author.note}</span> : null}
              <span>发布时间：{formatDateTime(detail.post.publishedAt ?? detail.post.createdAt)}</span>
              <span>最后更新：{formatDateTime(detail.post.updatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/circles/${detail.post.circle.slug}`} variant="secondary">
              返回圈子
            </ButtonLink>
            {detail.canEdit ? (
              <ButtonLink href={`/posts/${detail.post.id}/edit`}>编辑帖子</ButtonLink>
            ) : null}
          </div>
        </div>
      </div>

      {feedback ? (
        <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-2 text-sm leading-7">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_0.55fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <div
              className="prose prose-slate max-w-none text-base leading-8 text-slate-700"
              dangerouslySetInnerHTML={{ __html: detail.post.contentHtml }}
            />
          </SurfaceCard>

          {detail.post.poll ? (
            <SurfaceCard>
              <p className="eyebrow">投票内容</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {detail.post.poll.question ?? detail.post.title}
              </h2>
              <div className="mt-5 space-y-3">
                {detail.post.poll.options.map((option, index) => (
                  <div
                    className="rounded-[1.25rem] border border-black/8 bg-white/78 px-4 py-4"
                    key={option.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-800">
                        {index + 1}. {option.label}
                      </span>
                      <span className="text-xs text-slate-500">{option.voteCount} 票</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                这篇投票帖的结构已经创建完成，正式投票交互会在 Step 7 接进来。
              </p>
            </SurfaceCard>
          ) : null}

          <SurfaceCard className="grain-panel">
            <p className="eyebrow">评论区占位</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              评论与回复会在下一步接进来
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前先把帖子主链路跑通，评论结构、一层回复和匿名评论会在 Step 7 与投票、附件一起补齐。
            </p>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="h-fit">
            <p className="eyebrow">帖子信息</p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>圈子：{detail.post.circle.name}</p>
              <p>分类：{detail.post.circle.category.name}</p>
              <p>评论数：{detail.post.commentCount}</p>
              <p>互动数：{detail.post.reactionCount}</p>
              <p>收藏数：{detail.post.favoriteCount}</p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="h-fit">
            <p className="eyebrow">标签</p>
            {detail.post.tags.length === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-dashed border-black/10 bg-white/70 px-4 py-5 text-sm leading-7 text-slate-600">
                当前还没有配置标签。
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                {detail.post.tags.map((item) => (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.tag.scope === "GLOBAL"
                        ? "bg-[rgba(197,94,61,0.1)] text-[var(--color-accent)]"
                        : "bg-[rgba(23,107,108,0.1)] text-[var(--color-teal)]"
                    }`}
                    key={item.tag.id}
                  >
                    #{item.tag.name}
                  </span>
                ))}
              </div>
            )}
          </SurfaceCard>

          {detail.canEdit && activeUser ? (
            <SurfaceCard className="h-fit">
              <p className="eyebrow">作者操作</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink href={`/posts/${detail.post.id}/edit`} variant="secondary">
                  编辑帖子
                </ButtonLink>
                <form action={deletePostAction}>
                  <input name="postId" type="hidden" value={detail.post.id} />
                  <input name="returnTo" type="hidden" value={deleteReturnTo} />
                  <Button type="submit" variant="ghost">
                    删除帖子
                  </Button>
                </form>
              </div>
            </SurfaceCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
