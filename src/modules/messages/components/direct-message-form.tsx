"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/modules/auth/components/submit-button";
import { initialActionState } from "@/modules/auth/lib/types";
import { sendDirectMessageAction } from "@/modules/messages/actions";

export function DirectMessageForm({
  conversationId,
  recipientUsername,
  submitLabel = "发送私信",
  pendingLabel = "发送中..."
}: {
  conversationId?: string;
  recipientUsername?: string;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  const [state, formAction] = useActionState(sendDirectMessageAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {conversationId ? <input name="conversationId" type="hidden" value={conversationId} /> : null}
      {recipientUsername ? (
        <input name="recipientUsername" type="hidden" value={recipientUsername} />
      ) : null}

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">消息内容</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          name="content"
          placeholder="支持文字和表情。"
        />
        {state.fieldErrors?.content ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.content}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">图片 / GIF 链接</span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          name="mediaUrls"
          placeholder={"每行一个链接\n例如：\nhttps://example.com/hello.gif"}
        />
        {state.fieldErrors?.mediaUrls ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.mediaUrls}</p>
        ) : null}
      </label>

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
