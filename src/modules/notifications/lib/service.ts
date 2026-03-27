import "server-only";

import { NotificationType, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  invalidateRuntimeCacheByPrefix,
  readThroughRuntimeCache
} from "@/server/runtime-cache";

type NotificationPayload = {
  title: string;
  body: string;
  href?: string;
  actorUsername?: string | null;
  actorDisplayName?: string | null;
  conversationId?: string | null;
};

type NotificationClient = Prisma.TransactionClient;

function notificationCachePrefix(userId: string) {
  return `notifications:user:${userId}:`;
}

function notificationListCacheKey(userId: string, take: number) {
  return `${notificationCachePrefix(userId)}list:${take}`;
}

function notificationUnreadCountCacheKey(userId: string) {
  return `${notificationCachePrefix(userId)}unread-count`;
}

function invalidateNotificationCache(userId: string) {
  invalidateRuntimeCacheByPrefix(notificationCachePrefix(userId));
}

function parsePayload(value: Prisma.JsonValue): NotificationPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      title: "站内通知",
      body: "你收到了一条新的站内通知。"
    };
  }

  const payload = value as Record<string, unknown>;

  return {
    title:
      typeof payload.title === "string" && payload.title.trim()
        ? payload.title
        : "站内通知",
    body:
      typeof payload.body === "string" && payload.body.trim()
        ? payload.body
        : "你收到了一条新的站内通知。",
    href: typeof payload.href === "string" && payload.href.startsWith("/") ? payload.href : undefined,
    actorUsername:
      typeof payload.actorUsername === "string" ? payload.actorUsername : null,
    actorDisplayName:
      typeof payload.actorDisplayName === "string" ? payload.actorDisplayName : null,
    conversationId:
      typeof payload.conversationId === "string" ? payload.conversationId : null
  };
}

export async function markConversationDirectMessageNotificationsRead(
  userId: string,
  conversationId: string
) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      type: NotificationType.DIRECT_MESSAGE,
      isRead: false
    },
    select: {
      id: true,
      payloadJson: true
    }
  });

  const targetIds = notifications
    .filter((notification) => parsePayload(notification.payloadJson).conversationId === conversationId)
    .map((notification) => notification.id);

  if (targetIds.length === 0) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      id: {
        in: targetIds
      }
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  invalidateNotificationCache(userId);
}

export async function createNotification(
  client: NotificationClient,
  input: {
    userId: string;
    type: NotificationType;
    payload: NotificationPayload;
  }
) {
  const created = await client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      payloadJson: input.payload
    }
  });

  invalidateNotificationCache(input.userId);

  return created;
}

export async function createNotifications(
  client: NotificationClient,
  inputs: Array<{
    userId: string;
    type: NotificationType;
    payload: NotificationPayload;
  }>
) {
  if (inputs.length === 0) {
    return;
  }

  await Promise.all(
    inputs.map((input) =>
      createNotification(client, {
        userId: input.userId,
        type: input.type,
        payload: input.payload
      })
    )
  );
}

export async function listNotifications(userId: string, take = 30) {
  const normalizedTake = Math.max(1, Math.min(take, 50));

  return readThroughRuntimeCache({
    key: notificationListCacheKey(userId, normalizedTake),
    ttlMs: 8_000,
    loader: async () => {
      const notifications = await prisma.notification.findMany({
        where: {
          userId
        },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          type: true,
          payloadJson: true,
          isRead: true,
          readAt: true,
          createdAt: true
        },
        take: normalizedTake
      });

      return notifications.map((item) => ({
        id: item.id,
        type: item.type,
        isRead: item.isRead,
        readAt: item.readAt,
        createdAt: item.createdAt,
        ...parsePayload(item.payloadJson)
      }));
    }
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return readThroughRuntimeCache({
    key: notificationUnreadCountCacheKey(userId),
    ttlMs: 8_000,
    loader: () =>
      prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      })
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId
    },
    select: {
      id: true,
      isRead: true
    }
  });

  if (!notification) {
    return {
      ok: false,
      message: "未找到对应通知。"
    } as const;
  }

  if (notification.isRead) {
    return {
      ok: true,
      message: "通知已经是已读状态。"
    } as const;
  }

  await prisma.notification.update({
    where: {
      id: notification.id
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  invalidateNotificationCache(userId);

  return {
    ok: true,
    message: "通知已标记为已读。"
  } as const;
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  await prisma.userSetting.updateMany({
    where: {
      userId
    },
    data: {
      notificationsLastReadAt: new Date()
    }
  });

  invalidateNotificationCache(userId);

  return {
    ok: true,
    message: "所有通知都已标记为已读。"
  } as const;
}
