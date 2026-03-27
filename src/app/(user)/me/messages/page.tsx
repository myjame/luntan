import Link from "next/link";

import { AutoRefreshIndicator } from "@/components/ui/auto-refresh-indicator";
import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { DirectMessageForm } from "@/modules/messages/components/direct-message-form";
import {
  getDirectMessageComposerContext,
  listConversationSummaries
} from "@/modules/messages/lib/service";

type SearchParams = Promise<{
  to?: string;
}>;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function formatDate(value: Date | null | undefined) {
  return value ? dateFormatter.format(value) : "暂无消息";
}

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireActiveUser();
  const [{ to }, conversations] = await Promise.all([
    searchParams,
    listConversationSummaries(user.id, 24)
  ]);
  const composerTarget =
    typeof to === "string" && to.trim()
      ? await getDirectMessageComposerContext(user.id, to)
      : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <SurfaceCard className="h-fit">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">私信会话</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              当前支持基础站内私信能力。
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              支持文字、表情、图片和 GIF 链接。会话页会自动刷新，适合首版轮询式收发。
            </p>
          </div>
          <AutoRefreshIndicator intervalMs={10000} label="会话列表正在自动刷新" />
        </div>

        <div className="mt-6 grid gap-4">
          {conversations.length === 0 ? (
            <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
              你还没有任何私信会话，可以先从用户主页发起第一条私信。
            </div>
          ) : (
            conversations.map((conversation) => (
              <Link
                className="rounded-[1.25rem] border border-black/8 bg-white/80 px-4 py-4 transition hover:-translate-y-0.5"
                href={`/me/messages/${conversation.id}`}
                key={conversation.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-950">
                      {conversation.otherUser?.displayName ?? "未知用户"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      @{conversation.otherUser?.username ?? "unknown"}
                    </p>
                  </div>
                  <div className="text-right">
                    {conversation.unreadCount > 0 ? (
                      <span className="rounded-full bg-[rgba(197,94,61,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                        {conversation.unreadCount} 条未读
                      </span>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(conversation.lastMessageAt)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {conversation.latestMessage?.preview ?? "这段会话还没有消息。"}
                </p>
              </Link>
            ))
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <p className="eyebrow">发起私信</p>
        {composerTarget ? (
          <>
            <div className="mt-4 rounded-[1.25rem] border border-black/8 bg-white/78 px-4 py-4">
              <p className="text-lg font-semibold tracking-tight text-slate-950">
                {composerTarget.targetUser.displayName}
              </p>
              <p className="mt-2 text-sm text-slate-500">@{composerTarget.targetUser.username}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {composerTarget.targetUser.bio ?? "对方还没有填写个人简介。"}
              </p>
            </div>

            {composerTarget.existingConversationId ? (
              <div className="mt-5 rounded-[1.15rem] border border-black/8 bg-[rgba(255,255,255,0.72)] px-4 py-5 text-sm leading-7 text-slate-600">
                你们已经有现成会话，可以直接继续对话。
                <div className="mt-4">
                  <ButtonLink href={`/me/messages/${composerTarget.existingConversationId}`} variant="secondary">
                    进入现有会话
                  </ButtonLink>
                </div>
              </div>
            ) : composerTarget.canSend ? (
              <div className="mt-5">
                <DirectMessageForm recipientUsername={composerTarget.targetUser.username} />
              </div>
            ) : (
              <div className="mt-5 rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                {composerTarget.disabledReason ?? "当前无法向对方发起私信。"}
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
            从用户主页点击“发私信”，就可以在这里直接开始一段新会话。
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
