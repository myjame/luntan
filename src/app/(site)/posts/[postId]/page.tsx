import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import { ReportForm } from "@/modules/moderation/components/report-form";
import { deletePostAction, votePollAction } from "@/modules/posts/actions";
import { PostCommentForm } from "@/modules/posts/components/post-comment-form";
import { PostCommentThread } from "@/modules/posts/components/post-comment-thread";
import { getPostTypeMeta } from "@/modules/posts/lib/constants";
import { getPublicPostDetail, listPostComments } from "@/modules/posts/lib/service";
import {
  togglePostFavoriteAction,
  togglePostLikeAction
} from "@/modules/social/actions";
import {
  getCommentEmojiState,
  getPostInteractionState
} from "@/modules/social/lib/service";

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
  replyTo?: string;
  editComment?: string;
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

  if (result === "comment-created") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "评论已发布",
      message: message ?? "评论已经进入当前帖子。"
    };
  }

  if (result === "comment-updated") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "评论已更新",
      message: message ?? "修改后的评论已经生效。"
    };
  }

  if (result === "comment-pending") {
    return {
      className: "border-sky-500/16 bg-sky-500/8 text-sky-900",
      title: "评论已进入审核",
      message: message ?? "这条评论暂时不会公开展示，审核后会通知你。"
    };
  }

  if (result === "comment-deleted") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "评论已删除",
      message: message ?? "该评论已经从公开列表移除。"
    };
  }

  if (result === "voted") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "投票已提交",
      message: message ?? "你的选择已经记录。"
    };
  }

  if (result === "liked") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "点赞已记录",
      message: message ?? "这条内容已经加入你的点赞反馈。"
    };
  }

  if (result === "unliked") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "已取消点赞",
      message: message ?? "这条内容已从你的点赞反馈中移除。"
    };
  }

  if (result === "favorited") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "已加入收藏",
      message: message ?? "稍后可以在我的收藏里继续查看。"
    };
  }

  if (result === "unfavorited") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "已取消收藏",
      message: message ?? "这条内容已从你的收藏列表移除。"
    };
  }

  if (result === "comment-reacted") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "表情回应已更新",
      message: message ?? "评论互动状态已经刷新。"
    };
  }

  if (result === "reported") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "举报已提交",
      message: message ?? "管理员会尽快处理这条举报。"
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
  const comments = await listPostComments(postId);
  const commentIds = comments.flatMap((comment) => [
    comment.id,
    ...comment.replies.map((reply) => reply.id)
  ]);
  const [interactionState, emojiStateByCommentId] = await Promise.all([
    getPostInteractionState(postId, activeUser?.id),
    getCommentEmojiState(commentIds, activeUser?.id)
  ]);
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
  const returnTo = `/posts/${detail.post.id}`;

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
              <span>
                作者：
                {detail.post.isAnonymous ? (
                  author.label
                ) : (
                  <Link
                    className="font-medium text-slate-700 transition hover:text-slate-950"
                    href={`/users/${detail.post.author.username}`}
                  >
                    {author.label}
                  </Link>
                )}
              </span>
              {author.note ? <span>{author.note}</span> : null}
              <span>发布时间：{formatDateTime(detail.post.publishedAt ?? detail.post.createdAt)}</span>
              <span>最后更新：{formatDateTime(detail.post.updatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/circles/${detail.post.circle.slug}`} variant="secondary">
              返回圈子
            </ButtonLink>
            {!detail.post.isAnonymous ? (
              <ButtonLink href={`/users/${detail.post.author.username}`} variant="ghost">
                作者主页
              </ButtonLink>
            ) : null}
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
                <form action={votePollAction} className="space-y-3">
                  <input name="postId" type="hidden" value={detail.post.id} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  {detail.post.poll.options.map((option, index) => {
                    const selected = detail.pollState?.selectedOptionIds.includes(option.id);

                    return (
                      <label
                        className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-black/8 bg-white/78 px-4 py-4"
                        key={option.id}
                      >
                        <span className="flex items-center gap-3">
                          {activeUser && !detail.pollState?.isExpired ? (
                            <input
                              className="h-4 w-4 accent-[var(--color-accent)]"
                              defaultChecked={selected}
                              name="optionIds"
                              type={detail.post.poll?.allowMultiple ? "checkbox" : "radio"}
                              value={option.id}
                            />
                          ) : null}
                          <span className="text-sm font-medium text-slate-800">
                            {index + 1}. {option.label}
                          </span>
                        </span>
                        <span className="text-xs text-slate-500">
                          {detail.pollState?.canSeeResults ? `${option.voteCount} 票` : "投票后可见"}
                        </span>
                      </label>
                    );
                  })}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {activeUser ? (
                      detail.pollState?.isExpired ? (
                        <span className="text-sm text-slate-500">投票已经截止。</span>
                      ) : (
                        <Button type="submit">
                          {detail.pollState?.hasVoted ? "更新投票" : "提交投票"}
                        </Button>
                      )
                    ) : (
                      <ButtonLink href={`/login?redirectTo=${encodeURIComponent(returnTo)}`}>
                        登录后投票
                      </ButtonLink>
                    )}
                    <span className="text-sm text-slate-500">
                      {detail.post.poll.allowMultiple ? "当前投票支持多选" : "当前投票为单选"}
                    </span>
                  </div>
                </form>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {detail.post.poll.resultVisibility === "AFTER_VOTE"
                  ? "当前投票设置为“投票后可见结果”。"
                  : "当前投票结果对所有访客公开。"}
              </p>
            </SurfaceCard>
          ) : null}

          <SurfaceCard>
            <p className="eyebrow">发表评论</p>
            {activeUser ? (
              <div className="mt-5">
                <PostCommentForm
                  anonymousAvailable={detail.post.circle.allowAnonymous}
                  initialAnonymous={false}
                  mode="create"
                  pendingLabel="发布中..."
                  postId={detail.post.id}
                  submitLabel="发布评论"
                />
              </div>
            ) : (
              <div className="mt-5 rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                登录且审核通过后可以参与评论和回复。
                <div className="mt-4">
                  <ButtonLink href={`/login?redirectTo=${encodeURIComponent(returnTo)}`}>
                    登录后评论
                  </ButtonLink>
                </div>
              </div>
            )}
          </SurfaceCard>

          <PostCommentThread
            activeUser={activeUser ? { id: activeUser.id } : null}
            anonymousAvailable={detail.post.circle.allowAnonymous}
            comments={comments}
            currentUserId={currentUser?.id}
            currentUserRole={currentUser?.role}
            editComment={query.editComment}
            emojiStateByCommentId={emojiStateByCommentId}
            postId={detail.post.id}
            replyTo={query.replyTo}
            returnTo={returnTo}
          />
        </div>

        <div className="space-y-6">
          <SurfaceCard className="h-fit">
            <p className="eyebrow">帖子信息</p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>圈子：{detail.post.circle.name}</p>
              <p>分类：{detail.post.circle.category.name}</p>
              <p>评论数：{detail.post.commentCount}</p>
              <p>点赞数：{detail.post.reactionCount}</p>
              <p>收藏数：{detail.post.favoriteCount}</p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="h-fit">
            <p className="eyebrow">互动操作</p>
            {activeUser ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <form action={togglePostLikeAction}>
                  <input name="postId" type="hidden" value={detail.post.id} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <Button type="submit" variant={interactionState.isLiked ? "primary" : "secondary"}>
                    {interactionState.isLiked ? "已点赞" : "点赞"} · {detail.post.reactionCount}
                  </Button>
                </form>
                <form action={togglePostFavoriteAction}>
                  <input name="postId" type="hidden" value={detail.post.id} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <Button
                    type="submit"
                    variant={interactionState.isFavorited ? "primary" : "secondary"}
                  >
                    {interactionState.isFavorited ? "已收藏" : "收藏"} · {detail.post.favoriteCount}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="mt-5">
                <ButtonLink href={`/login?redirectTo=${encodeURIComponent(returnTo)}`}>
                  登录后互动
                </ButtonLink>
              </div>
            )}
            <p className="mt-4 text-sm leading-7 text-slate-600">
              点赞、收藏会同步更新到个人主页和我的列表页。
            </p>
          </SurfaceCard>

          <SurfaceCard className="h-fit">
            <p className="eyebrow">附件</p>
            {detail.post.attachments.length === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-dashed border-black/10 bg-white/70 px-4 py-5 text-sm leading-7 text-slate-600">
                当前帖子没有上传文档附件。
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {detail.post.attachments.map((attachment) => (
                  <div
                    className="rounded-[1.25rem] border border-black/8 bg-white/78 px-4 py-4"
                    key={attachment.id}
                  >
                    <p className="text-sm font-semibold text-slate-900">{attachment.originalName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {attachment.extension.toUpperCase()} · {(attachment.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <div className="mt-3">
                      {activeUser ? (
                        <Link
                          className="text-sm font-semibold text-[var(--color-accent)]"
                          href={attachment.accessUrl ?? `/api/attachments/${attachment.id}`}
                        >
                          下载附件
                        </Link>
                      ) : (
                        <Link
                          className="text-sm font-semibold text-[var(--color-accent)]"
                          href={`/login?redirectTo=${encodeURIComponent(returnTo)}`}
                        >
                          登录后下载
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

          <SurfaceCard className="h-fit">
            <p className="eyebrow">内容治理</p>
            {activeUser ? (
              activeUser.id === detail.post.author.id ? (
                <div className="mt-5 rounded-[1.25rem] border border-dashed border-black/10 bg-white/70 px-4 py-5 text-sm leading-7 text-slate-600">
                  这是你自己的帖子，如需调整内容可以直接编辑；举报入口对本人内容默认关闭。
                </div>
              ) : (
                <div className="mt-5">
                  <ReportForm
                    defaultOpen={query.result === "reported"}
                    description="如果帖子存在攻击、广告、违规或其他问题，可以直接提交举报。"
                    returnTo={returnTo}
                    summaryLabel="举报这篇帖子"
                    targetId={detail.post.id}
                    targetType="POST"
                  />
                </div>
              )
            ) : (
              <div className="mt-5">
                <ButtonLink href={`/login?redirectTo=${encodeURIComponent(returnTo)}`} variant="secondary">
                  登录后举报
                </ButtonLink>
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
