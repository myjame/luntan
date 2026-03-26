import Link from "next/link";

import { SurfaceCard } from "@/components/ui/card";
import type { UserCommentListItem } from "@/modules/social/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function getCommentMediaUrls(comment: UserCommentListItem) {
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

export function UserCommentCard({
  comment,
  showAnonymousHint = false
}: {
  comment: UserCommentListItem;
  showAnonymousHint?: boolean;
}) {
  const mediaUrls = getCommentMediaUrls(comment);

  return (
    <SurfaceCard className="h-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            className="text-lg font-semibold tracking-tight text-slate-950 transition hover:text-[var(--color-accent)]"
            href={`/posts/${comment.post.id}#comment-${comment.id}`}
          >
            {comment.post.title}
          </Link>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            来自圈子
            <Link
              className="ml-1 font-medium text-slate-700 transition hover:text-slate-950"
              href={`/circles/${comment.post.circle.slug}`}
            >
              {comment.post.circle.name}
            </Link>
          </p>
        </div>
        <span className="text-sm text-slate-500">{dateFormatter.format(comment.createdAt)}</span>
      </div>

      {showAnonymousHint && comment.isAnonymous ? (
        <div className="mt-4 inline-flex rounded-full bg-[rgba(197,94,61,0.1)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
          匿名内容（仅你可见）
        </div>
      ) : null}

      <div
        className="mt-4 prose prose-slate max-w-none text-sm leading-7 text-slate-700"
        dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
      />

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
        <span>{comment.reactionCount} 条表情回应</span>
        {mediaUrls.length > 0 ? <span>{mediaUrls.length} 个图片 / GIF 链接</span> : null}
      </div>
    </SurfaceCard>
  );
}
