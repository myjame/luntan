import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { deleteCommentAction } from "@/modules/posts/actions";
import { PostCommentForm } from "@/modules/posts/components/post-comment-form";
import type { CommentThreadItem } from "@/modules/posts/lib/service";

function getCommentAuthorText(input: {
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
      label: "匿名评论（你）",
      note: null
    };
  }

  return {
    label: "匿名用户",
    note: null
  };
}

function getCommentMediaUrls(comment: {
  contentJson: unknown;
}) {
  if (
    !comment.contentJson ||
    typeof comment.contentJson !== "object" ||
    Array.isArray(comment.contentJson)
  ) {
    return [];
  }

  const mediaUrls = (comment.contentJson as { mediaUrls?: unknown }).mediaUrls;

  return Array.isArray(mediaUrls)
    ? mediaUrls.filter((item): item is string => typeof item === "string")
    : [];
}

type CommentCardProps = {
  comment: CommentThreadItem["replies"][number] | CommentThreadItem;
  postId: string;
  returnTo: string;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  activeUser?: {
    id: string;
  } | null;
  anonymousAvailable: boolean;
  replyTo?: string;
  editComment?: string;
  isReply?: boolean;
};

function CommentCard({
  comment,
  postId,
  returnTo,
  currentUserId,
  currentUserRole,
  activeUser,
  anonymousAvailable,
  replyTo,
  editComment,
  isReply = false
}: CommentCardProps) {
  const authorName = comment.author.profile?.nickname ?? comment.author.username;
  const author = getCommentAuthorText({
    isAnonymous: comment.isAnonymous,
    currentUserId,
    currentUserRole,
    authorId: comment.author.id,
    authorName
  });
  const isOwner = activeUser?.id === comment.author.id;
  const mediaUrls = getCommentMediaUrls(comment);

  return (
    <div
      className={`rounded-[1.25rem] border border-black/8 bg-white/78 px-4 py-4 ${
        isReply ? "ml-0 md:ml-8" : ""
      }`}
      id={`comment-${comment.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{author.label}</p>
          {author.note ? <p className="mt-1 text-xs text-slate-500">{author.note}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>{new Intl.DateTimeFormat("zh-CN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }).format(comment.createdAt)}</span>
          {activeUser ? (
            <Link
              className="font-semibold text-[var(--color-accent)]"
              href={`${returnTo}?replyTo=${comment.parentId ? comment.rootId ?? comment.parentId : comment.id}#comment-${comment.id}`}
            >
              回复
            </Link>
          ) : null}
          {isOwner ? (
            <Link
              className="font-semibold text-slate-700"
              href={`${returnTo}?editComment=${comment.id}#comment-${comment.id}`}
            >
              编辑
            </Link>
          ) : null}
        </div>
      </div>

      <div
        className="mt-3 prose prose-slate max-w-none text-sm leading-7 text-slate-700"
        dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
      />

      {mediaUrls.length > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          已附带 {mediaUrls.length} 个图片 / GIF 链接。
        </p>
      ) : null}

      {isOwner && editComment === comment.id ? (
        <div className="mt-4 rounded-[1.15rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4">
          <PostCommentForm
            anonymousAvailable={anonymousAvailable}
            commentId={comment.id}
            initialAnonymous={comment.isAnonymous}
            initialContent={
              typeof (comment.contentJson as { text?: unknown })?.text === "string"
                ? ((comment.contentJson as { text?: string }).text ?? "")
                : ""
            }
            initialMediaUrls={mediaUrls.join("\n")}
            mode="edit"
            pendingLabel="保存中..."
            postId={postId}
            submitLabel="保存评论"
          />
        </div>
      ) : null}

      {isOwner ? (
        <div className="mt-4">
          <form action={deleteCommentAction}>
            <input name="commentId" type="hidden" value={comment.id} />
            <input name="postId" type="hidden" value={postId} />
            <input name="returnTo" type="hidden" value={`${returnTo}#comments`} />
            <Button type="submit" variant="ghost">
              删除评论
            </Button>
          </form>
        </div>
      ) : null}

      {!comment.parentId && replyTo === comment.id && activeUser ? (
        <div className="mt-4 rounded-[1.15rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4">
          <PostCommentForm
            anonymousAvailable={anonymousAvailable}
            initialAnonymous={false}
            mode="create"
            parentId={comment.id}
            pendingLabel="回复中..."
            postId={postId}
            rootId={comment.id}
            submitLabel="发布回复"
          />
        </div>
      ) : null}
    </div>
  );
}

export function PostCommentThread({
  comments,
  postId,
  returnTo,
  currentUserId,
  currentUserRole,
  activeUser,
  anonymousAvailable,
  replyTo,
  editComment
}: {
  comments: CommentThreadItem[];
  postId: string;
  returnTo: string;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  activeUser?: { id: string } | null;
  anonymousAvailable: boolean;
  replyTo?: string;
  editComment?: string;
}) {
  return (
    <SurfaceCard className="grain-panel" id="comments">
      <p className="eyebrow">评论区</p>
      {comments.length === 0 ? (
        <div className="mt-5 rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
          当前还没有评论，可以先发出第一条观点。
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                activeUser={activeUser}
                anonymousAvailable={anonymousAvailable}
                comment={comment}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                editComment={editComment}
                postId={postId}
                replyTo={replyTo}
                returnTo={returnTo}
              />
              {comment.replies.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {comment.replies.map((reply) => (
                    <CommentCard
                      activeUser={activeUser}
                      anonymousAvailable={anonymousAvailable}
                      comment={reply}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                      editComment={editComment}
                      isReply
                      key={reply.id}
                      postId={postId}
                      returnTo={returnTo}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}
