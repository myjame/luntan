import Link from "next/link";

import { AutoRefreshIndicator } from "@/components/ui/auto-refresh-indicator";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction
} from "@/modules/notifications/actions";
import {
  getUnreadNotificationCount,
  listNotifications
} from "@/modules/notifications/lib/service";

type SearchParams = Promise<{
  result?: string;
  message?: string;
}>;

function getFeedback(result?: string, message?: string) {
  if (result === "read") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "通知已读",
      message: message ?? "这条通知已经从未读列表中移除。"
    };
  }

  if (result === "all-read") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "全部已读",
      message: message ?? "当前通知列表已经全部标记为已读。"
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

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireActiveUser();
  const [query, unreadCount, notifications] = await Promise.all([
    searchParams,
    getUnreadNotificationCount(user.id),
    listNotifications(user.id, 40)
  ]);
  const feedback = getFeedback(query.result, query.message);

  return (
    <div className="grid gap-6">
      <SurfaceCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">我的通知</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              互动提醒、审核结果和私信提示都会汇总到这里。
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              当前未读 {unreadCount} 条。页面会自动轮询刷新，你也可以手动把全部通知标记为已读。
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <form action={markAllNotificationsReadAction}>
              <input name="returnTo" type="hidden" value="/me/notifications" />
              <Button type="submit" variant="secondary">
                全部标记为已读
              </Button>
            </form>
            <AutoRefreshIndicator intervalMs={15000} label="通知列表正在自动轮询" />
          </div>
        </div>
      </SurfaceCard>

      {feedback ? (
        <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-2 text-sm leading-7">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-4">
        {notifications.length === 0 ? (
          <SurfaceCard className="grain-panel">
            <p className="eyebrow">通知为空</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              你暂时还没有任何通知，后续的点赞、评论、回复、关注和私信都会从这里进入。
            </p>
          </SurfaceCard>
        ) : (
          notifications.map((notification) => (
            <SurfaceCard
              className={notification.isRead ? "border-black/8" : "border-[var(--color-accent)]/18 bg-[rgba(255,251,247,0.96)]"}
              key={notification.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        notification.isRead
                          ? "bg-[rgba(24,32,45,0.08)] text-slate-700"
                          : "bg-[rgba(197,94,61,0.12)] text-[var(--color-accent)]"
                      }`}
                    >
                      {notification.isRead ? "已读" : "未读"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Intl.DateTimeFormat("zh-CN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      }).format(notification.createdAt)}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                    {notification.href ? (
                      <Link className="transition hover:text-[var(--color-accent)]" href={notification.href}>
                        {notification.title}
                      </Link>
                    ) : (
                      notification.title
                    )}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{notification.body}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {notification.href ? (
                    <Link
                      className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
                      href={notification.href}
                    >
                      查看详情
                    </Link>
                  ) : null}
                  {!notification.isRead ? (
                    <form action={markNotificationReadAction}>
                      <input name="notificationId" type="hidden" value={notification.id} />
                      <input name="returnTo" type="hidden" value="/me/notifications" />
                      <Button type="submit" variant="ghost">
                        标为已读
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </SurfaceCard>
          ))
        )}
      </div>
    </div>
  );
}
