import Link from "next/link";

import { SurfaceCard } from "@/components/ui/card";
import { getPostTypeMeta } from "@/modules/posts/lib/constants";
import type { PostFeedItem } from "@/modules/posts/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "刚刚";
  }

  return dateFormatter.format(value);
}

function getAuthorLabel(input: {
  post: PostFeedItem;
  currentUserId?: string | null;
  currentUserRole?: string | null;
}) {
  const realName =
    input.post.author.profile?.nickname ?? input.post.author.username;

  if (!input.post.isAnonymous) {
    return {
      label: realName,
      note: null
    };
  }

  if (input.currentUserRole === "SUPER_ADMIN") {
    return {
      label: "匿名用户",
      note: `实际作者：${realName}`
    };
  }

  if (input.currentUserId && input.currentUserId === input.post.author.id) {
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

export function PostFeedCard({
  post,
  showCircle = true,
  compact = false,
  currentUserId,
  currentUserRole
}: {
  post: PostFeedItem;
  showCircle?: boolean;
  compact?: boolean;
  currentUserId?: string | null;
  currentUserRole?: string | null;
}) {
  const typeMeta = getPostTypeMeta(post.postType);
  const author = getAuthorLabel({
    post,
    currentUserId,
    currentUserRole
  });

  return (
    <SurfaceCard className={compact ? "h-full" : "grain-panel"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${typeMeta.className}`}>
            {typeMeta.label}
          </span>
          {post.isPinned ? (
            <span className="rounded-full border border-black/8 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
              置顶
            </span>
          ) : null}
          {post.poll ? (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {post.poll.allowMultiple ? "多选投票" : "单选投票"}
            </span>
          ) : null}
        </div>
        <span className="text-sm text-slate-500">
          {formatDateTime(post.publishedAt ?? post.createdAt)}
        </span>
      </div>

      <div className={compact ? "mt-4" : "mt-5"}>
        <Link className="transition hover:text-[var(--color-accent)]" href={`/posts/${post.id}`}>
          <h3 className={compact ? "text-xl font-semibold tracking-tight text-slate-950" : "text-2xl font-semibold tracking-tight text-slate-950"}>
            {post.title}
          </h3>
        </Link>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {post.excerpt ?? "这篇帖子暂时还没有摘要。"}
        </p>
      </div>

      {post.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((item) => (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                item.tag.scope === "GLOBAL"
                  ? "bg-[rgba(197,94,61,0.1)] text-[var(--color-accent)]"
                  : "bg-[rgba(23,107,108,0.1)] text-[var(--color-teal)]"
              }`}
              key={`${post.id}-${item.tag.id}`}
            >
              #{item.tag.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 text-sm leading-6 text-slate-500">
        <div>
          <p>
            作者：
            {post.isAnonymous ? (
              author.label
            ) : (
              <Link
                className="font-medium text-slate-700 transition hover:text-slate-950"
                href={`/users/${post.author.username}`}
              >
                {author.label}
              </Link>
            )}
          </p>
          {author.note ? <p>{author.note}</p> : null}
          {showCircle ? (
            <p>
              圈子：
              <Link
                className="font-medium text-slate-700 transition hover:text-slate-950"
                href={`/circles/${post.circle.slug}`}
              >
                {post.circle.name}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span>{post.commentCount} 评论</span>
          <span>{post.reactionCount} 点赞</span>
          <span>{post.favoriteCount} 收藏</span>
        </div>
      </div>
    </SurfaceCard>
  );
}
