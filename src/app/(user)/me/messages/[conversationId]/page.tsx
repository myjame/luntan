import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefreshIndicator } from "@/components/ui/auto-refresh-indicator";
import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { DirectMessageForm } from "@/modules/messages/components/direct-message-form";
import {
  getConversationDetail,
  markConversationRead
} from "@/modules/messages/lib/service";

type PageParams = Promise<{
  conversationId: string;
}>;

type SearchParams = Promise<{
  result?: string;
  message?: string;
}>;

function getFeedback(result?: string, message?: string) {
  if (result === "sent") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "私信已发送",
      message: message ?? "消息已经进入当前会话。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "发送未完成",
      message: message ?? "请稍后再试。"
    };
  }

  return null;
}

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const user = await requireActiveUser();
  const [{ conversationId }, query] = await Promise.all([params, searchParams]);

  await markConversationRead(conversationId, user.id);

  const detail = await getConversationDetail(conversationId, user.id);

  if (!detail) {
    notFound();
  }

  const feedback = getFeedback(query.result, query.message);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.66fr_1.34fr]">
      <SurfaceCard className="h-fit">
        <p className="eyebrow">会话信息</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          {detail.otherUser.displayName}
        </h2>
        <p className="mt-2 text-sm text-slate-500">@{detail.otherUser.username}</p>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {detail.otherUser.bio ?? "对方还没有填写个人简介。"}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/me/messages" variant="secondary">
            返回会话列表
          </ButtonLink>
          <ButtonLink href={`/users/${detail.otherUser.username}`} variant="ghost">
            查看对方主页
          </ButtonLink>
        </div>

        <div className="mt-6">
          <AutoRefreshIndicator intervalMs={8000} label="当前会话正在自动刷新" />
        </div>
      </SurfaceCard>

      <div className="grid gap-6">
        {feedback ? (
          <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
            <p className="text-sm font-semibold">{feedback.title}</p>
            <p className="mt-2 text-sm leading-7">{feedback.message}</p>
          </div>
        ) : null}

        <SurfaceCard>
          <p className="eyebrow">消息记录</p>
          <div className="mt-6 space-y-4">
            {detail.messages.length === 0 ? (
              <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                这段会话还没有消息，可以先发出第一条内容。
              </div>
            ) : (
              detail.messages.map((message) => (
                <div
                  className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[78%] rounded-[1.5rem] px-4 py-4 text-sm leading-7 ${
                      message.isMine
                        ? "bg-[var(--color-accent)] text-white"
                        : "border border-black/8 bg-white/84 text-slate-700"
                    }`}
                  >
                    <p className={`text-xs ${message.isMine ? "text-white/78" : "text-slate-500"}`}>
                      {message.isMine ? "你" : message.senderName}
                    </p>

                    {message.contentText ? (
                      <p className="mt-2 whitespace-pre-wrap">{message.contentText}</p>
                    ) : null}

                    {message.mediaUrls.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {message.mediaUrls.map((url) => (
                          <Link
                            className={`block break-all underline ${message.isMine ? "text-white" : "text-[var(--color-accent)]"}`}
                            href={url}
                            key={url}
                            target="_blank"
                          >
                            {url}
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    <p className={`mt-3 text-xs ${message.isMine ? "text-white/70" : "text-slate-500"}`}>
                      {new Intl.DateTimeFormat("zh-CN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      }).format(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="eyebrow">发送私信</p>
          {detail.canSend ? (
            <div className="mt-5">
              <DirectMessageForm conversationId={detail.conversation.id} />
            </div>
          ) : (
            <div className="mt-5 rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
              {detail.disabledReason ?? "当前无法继续向对方发送私信。"}
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
