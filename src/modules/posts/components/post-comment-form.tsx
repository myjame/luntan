"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/modules/auth/components/submit-button";
import { initialActionState } from "@/modules/auth/lib/types";
import {
  createCommentAction,
  updateCommentAction
} from "@/modules/posts/actions";

export function PostCommentForm({
  postId,
  mode,
  commentId,
  parentId,
  rootId,
  initialContent = "",
  initialMediaUrls = "",
  initialAnonymous = false,
  anonymousAvailable,
  submitLabel,
  pendingLabel
}: {
  postId: string;
  mode: "create" | "edit";
  commentId?: string;
  parentId?: string;
  rootId?: string;
  initialContent?: string;
  initialMediaUrls?: string;
  initialAnonymous?: boolean;
  anonymousAvailable: boolean;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction] = useActionState(
    mode === "create" ? createCommentAction : updateCommentAction,
    initialActionState
  );

  return (
    <form action={formAction} className="space-y-4">
      <input name="postId" type="hidden" value={postId} />
      {commentId ? <input name="commentId" type="hidden" value={commentId} /> : null}
      {parentId ? <input name="parentId" type="hidden" value={parentId} /> : null}
      {rootId ? <input name="rootId" type="hidden" value={rootId} /> : null}

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">评论内容</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={initialContent}
          name="content"
          placeholder="先支持文字、表情和图片/GIF 链接。"
        />
        {state.fieldErrors?.content ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.content}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">图片 / GIF 链接</span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={initialMediaUrls}
          name="mediaUrls"
          placeholder={"每行一个链接\n例如：\nhttps://example.com/reply.gif"}
        />
        {state.fieldErrors?.mediaUrls ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.mediaUrls}</p>
        ) : null}
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/72 px-4 py-4">
        <input
          className="h-4 w-4 accent-[var(--color-accent)]"
          defaultChecked={initialAnonymous}
          disabled={!anonymousAvailable}
          name="isAnonymous"
          type="checkbox"
        />
        <span className="text-sm text-slate-700">
          {anonymousAvailable ? "以匿名身份评论" : "当前圈子未开启匿名评论"}
        </span>
      </label>
      {state.fieldErrors?.isAnonymous ? (
        <p className="text-xs text-[var(--color-accent)]">{state.fieldErrors.isAnonymous}</p>
      ) : null}

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
