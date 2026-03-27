import "server-only";

import {
  ConversationType,
  DirectMessagePermission,
  MessageType,
  NotificationType,
  UserStatus,
  type Prisma
} from "@/generated/prisma/client";
import {
  createNotification,
  markConversationDirectMessageNotificationsRead
} from "@/modules/notifications/lib/service";
import { messageEditorSchema } from "@/modules/messages/lib/validation";
import { prisma } from "@/server/db/prisma";

function validationErrors(error: unknown) {
  if (!(error instanceof Error) || !("issues" in error)) {
    return undefined;
  }

  const issues = (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues;

  return Object.fromEntries(
    issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])
  ) as Record<string, string>;
}

function parseMediaUrls(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function getMediaFileType(url: string) {
  return /\.(gif)(?:\?.*)?$/i.test(url) ? "gif" : "image";
}

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function resolveMessageType(text: string, mediaUrls: string[]) {
  if (mediaUrls.length > 0 && text.length === 0) {
    return getMediaFileType(mediaUrls[0]) === "gif" ? MessageType.GIF : MessageType.IMAGE;
  }

  if (/^\p{Extended_Pictographic}[\p{Extended_Pictographic}\uFE0F\s]*$/u.test(text)) {
    return MessageType.EMOJI;
  }

  return MessageType.TEXT;
}

function toDisplayName(user: {
  username: string;
  profile?: { nickname?: string | null } | null;
}) {
  return user.profile?.nickname ?? user.username;
}

function buildMessagePreview(input: {
  messageType: MessageType;
  contentText: string | null;
  contentJson: Prisma.JsonValue | null;
}) {
  if (input.messageType === MessageType.GIF) {
    return "发送了一张 GIF";
  }

  if (input.messageType === MessageType.IMAGE) {
    return "发送了一张图片";
  }

  if (input.messageType === MessageType.EMOJI) {
    return input.contentText ?? "发送了一个表情";
  }

  return input.contentText?.trim() || "发送了一条消息";
}

function extractMessageMediaUrls(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const mediaUrls = (value as { mediaUrls?: unknown }).mediaUrls;

  return Array.isArray(mediaUrls)
    ? mediaUrls.filter((item): item is string => typeof item === "string")
    : [];
}

async function canSendMessageToRecipient(
  client: Prisma.TransactionClient,
  input: {
    senderId: string;
    recipientId: string;
    permission: DirectMessagePermission;
  }
) {
  const [blockedBySender, blockedByRecipient] = await Promise.all([
    client.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: input.senderId,
          blockedId: input.recipientId
        }
      },
      select: {
        id: true
      }
    }),
    client.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: input.recipientId,
          blockedId: input.senderId
        }
      },
      select: {
        id: true
      }
    })
  ]);

  if (blockedBySender || blockedByRecipient) {
    return {
      ok: false,
      message: "当前存在屏蔽关系，暂时不能发送私信。"
    } as const;
  }

  if (input.permission === DirectMessagePermission.EVERYONE) {
    return {
      ok: true
    } as const;
  }

  if (input.permission === DirectMessagePermission.DISABLED) {
    return {
      ok: false,
      message: "对方当前已关闭私信。"
    } as const;
  }

  const relation = await client.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: input.recipientId,
        followingId: input.senderId
      }
    },
    select: {
      id: true
    }
  });

  if (!relation) {
    return {
      ok: false,
      message: "对方当前仅允许已关注用户发起私信。"
    } as const;
  }

  return {
    ok: true
  } as const;
}

async function findExistingDirectConversation(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
  otherUserId: string
) {
  return client.conversation.findFirst({
    where: {
      conversationType: ConversationType.DIRECT,
      AND: [
        {
          participants: {
            some: {
              userId
            }
          }
        },
        {
          participants: {
            some: {
              userId: otherUserId
            }
          }
        }
      ]
    },
    select: {
      id: true
    }
  });
}

export async function listConversationSummaries(userId: string, take = 24) {
  const conversations = await prisma.conversation.findMany({
    where: {
      conversationType: ConversationType.DIRECT,
      participants: {
        some: {
          userId
        }
      }
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      lastMessageAt: true,
      updatedAt: true,
      participants: {
        select: {
          userId: true,
          lastReadAt: true,
          user: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  nickname: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      },
      messages: {
        where: {
          isDeleted: false
        },
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: {
          id: true,
          senderId: true,
          messageType: true,
          contentText: true,
          contentJson: true,
          createdAt: true
        }
      }
    },
    take: Math.max(1, Math.min(take, 40))
  });

  return Promise.all(
    conversations.map(async (conversation) => {
      const currentParticipant = conversation.participants.find((item) => item.userId === userId);
      const otherParticipant = conversation.participants.find((item) => item.userId !== userId);
      const latestMessage = conversation.messages[0] ?? null;
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          isDeleted: false,
          senderId: {
            not: userId
          },
          ...(currentParticipant?.lastReadAt
            ? {
                createdAt: {
                  gt: currentParticipant.lastReadAt
                }
              }
            : {})
        }
      });

      return {
        id: conversation.id,
        lastMessageAt: conversation.lastMessageAt ?? latestMessage?.createdAt ?? conversation.updatedAt,
        unreadCount,
        otherUser: otherParticipant
          ? {
              id: otherParticipant.user.id,
              username: otherParticipant.user.username,
              displayName: toDisplayName(otherParticipant.user),
              avatarUrl: otherParticipant.user.profile?.avatarUrl ?? null
            }
          : null,
        latestMessage: latestMessage
          ? {
              id: latestMessage.id,
              senderId: latestMessage.senderId,
              preview: buildMessagePreview(latestMessage),
              createdAt: latestMessage.createdAt
            }
          : null
      };
    })
  );
}

export async function getDirectMessageComposerContext(senderId: string, username: string) {
  const targetUser = await prisma.user.findFirst({
    where: {
      username,
      status: UserStatus.ACTIVE
    },
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          nickname: true,
          avatarUrl: true,
          bio: true
        }
      },
      settings: {
        select: {
          directMessagePermission: true
        }
      }
    }
  });

  if (!targetUser || targetUser.id === senderId) {
    return null;
  }

  const [existingConversation, permission] = await prisma.$transaction(async (tx) => [
    await findExistingDirectConversation(tx, senderId, targetUser.id),
    await canSendMessageToRecipient(tx, {
      senderId,
      recipientId: targetUser.id,
      permission:
        targetUser.settings?.directMessagePermission ?? DirectMessagePermission.FOLLOWING_ONLY
    })
  ]);

  return {
    targetUser: {
      id: targetUser.id,
      username: targetUser.username,
      displayName: toDisplayName(targetUser),
      avatarUrl: targetUser.profile?.avatarUrl ?? null,
      bio: targetUser.profile?.bio ?? null
    },
    existingConversationId: existingConversation?.id ?? null,
    canSend: permission.ok,
    disabledReason: permission.ok ? null : permission.message
  };
}

export async function getConversationDetail(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      conversationType: ConversationType.DIRECT,
      participants: {
        some: {
          userId
        }
      }
    },
    select: {
      id: true,
      lastMessageAt: true,
      participants: {
        select: {
          userId: true,
          lastReadAt: true,
          user: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  nickname: true,
                  avatarUrl: true,
                  bio: true
                }
              },
              settings: {
                select: {
                  directMessagePermission: true
                }
              }
            }
          }
        }
      },
      messages: {
        where: {
          isDeleted: false
        },
        orderBy: [{ createdAt: "asc" }],
        take: 80,
        select: {
          id: true,
          senderId: true,
          messageType: true,
          contentText: true,
          contentJson: true,
          createdAt: true,
          sender: {
            select: {
              username: true,
              profile: {
                select: {
                  nickname: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!conversation) {
    return null;
  }

  const currentParticipant = conversation.participants.find((item) => item.userId === userId);
  const otherParticipant = conversation.participants.find((item) => item.userId !== userId);

  if (!currentParticipant || !otherParticipant) {
    return null;
  }

  const permission = await prisma.$transaction((tx) =>
    canSendMessageToRecipient(tx, {
      senderId: userId,
      recipientId: otherParticipant.user.id,
      permission:
        otherParticipant.user.settings?.directMessagePermission ??
        DirectMessagePermission.FOLLOWING_ONLY
    })
  );

  return {
    conversation: {
      id: conversation.id,
      lastMessageAt: conversation.lastMessageAt
    },
    currentParticipant: {
      userId: currentParticipant.userId,
      lastReadAt: currentParticipant.lastReadAt
    },
    otherUser: {
      id: otherParticipant.user.id,
      username: otherParticipant.user.username,
      displayName: toDisplayName(otherParticipant.user),
      avatarUrl: otherParticipant.user.profile?.avatarUrl ?? null,
      bio: otherParticipant.user.profile?.bio ?? null
    },
    canSend: permission.ok,
    disabledReason: permission.ok ? null : permission.message,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      senderName: toDisplayName(message.sender),
      messageType: message.messageType,
      contentText: message.contentText,
      mediaUrls: extractMessageMediaUrls(message.contentJson),
      createdAt: message.createdAt,
      isMine: message.senderId === userId
    }))
  };
}

export async function markConversationRead(conversationId: string, userId: string) {
  const latestIncomingMessage = await prisma.message.findFirst({
    where: {
      conversationId,
      isDeleted: false,
      senderId: {
        not: userId
      }
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      createdAt: true
    }
  });

  if (!latestIncomingMessage) {
    return;
  }

  await prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId
    },
    data: {
      lastReadMessageId: latestIncomingMessage.id,
      lastReadAt: latestIncomingMessage.createdAt
    }
  });

  await markConversationDirectMessageNotificationsRead(userId, conversationId);
}

export async function listConversationMessages(
  conversationId: string,
  userId: string,
  take = 80
) {
  const detail = await getConversationDetail(conversationId, userId);

  if (!detail) {
    return null;
  }

  return detail.messages.slice(-take);
}

export async function sendDirectMessage(
  sender: {
    id: string;
    username: string;
    profile?: { nickname: string | null } | null;
  },
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = messageEditorSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查私信内容后再发送。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const normalizedText = normalizeText(parsed.data.content);
  const mediaUrls = parseMediaUrls(parsed.data.mediaUrls);

  return prisma.$transaction(async (tx) => {
    let conversationId = parsed.data.conversationId || "";
    let recipient:
      | {
          id: string;
          username: string;
          profile: { nickname: string | null } | null;
          settings: { directMessagePermission: DirectMessagePermission } | null;
        }
      | null = null;

    if (conversationId) {
      const conversation = await tx.conversation.findFirst({
        where: {
          id: conversationId,
          conversationType: ConversationType.DIRECT,
          participants: {
            some: {
              userId: sender.id
            }
          }
        },
        select: {
          id: true,
          participants: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  profile: {
                    select: {
                      nickname: true
                    }
                  },
                  settings: {
                    select: {
                      directMessagePermission: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      recipient =
        conversation?.participants.find((participant) => participant.userId !== sender.id)?.user ?? null;

      if (!conversation || !recipient) {
        return {
          ok: false,
          message: "未找到对应的私信会话。"
        } as const;
      }
    } else {
      recipient = await tx.user.findFirst({
        where: {
          username: parsed.data.recipientUsername,
          status: UserStatus.ACTIVE
        },
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              nickname: true
            }
          },
          settings: {
            select: {
              directMessagePermission: true
            }
          }
        }
      });

      if (!recipient || recipient.id === sender.id) {
        return {
          ok: false,
          message: "未找到可私信的对象。"
        } as const;
      }

      const existingConversation = await findExistingDirectConversation(tx, sender.id, recipient.id);

      if (existingConversation) {
        conversationId = existingConversation.id;
      }
    }

    const permission = await canSendMessageToRecipient(tx, {
      senderId: sender.id,
      recipientId: recipient.id,
      permission:
        recipient.settings?.directMessagePermission ?? DirectMessagePermission.FOLLOWING_ONLY
    });

    if (!permission.ok) {
      return {
        ok: false,
        message: permission.message
      } as const;
    }

    if (!conversationId) {
      const conversation = await tx.conversation.create({
        data: {
          conversationType: ConversationType.DIRECT,
          createdById: sender.id,
          lastMessageAt: new Date(),
          participants: {
            create: [{ userId: sender.id }, { userId: recipient.id }]
          }
        },
        select: {
          id: true
        }
      });

      conversationId = conversation.id;
    }

    const messageType = resolveMessageType(normalizedText, mediaUrls);
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId: sender.id,
        messageType,
        contentText: normalizedText || null,
        contentJson: {
          mediaUrls
        } satisfies Prisma.JsonObject
      },
      select: {
        id: true,
        createdAt: true
      }
    });

    await tx.conversation.update({
      where: {
        id: conversationId
      },
      data: {
        lastMessageAt: message.createdAt
      }
    });

    await tx.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: sender.id
      },
      data: {
        lastReadMessageId: message.id,
        lastReadAt: message.createdAt
      }
    });

    await tx.userProfile.updateMany({
      where: {
        userId: sender.id
      },
      data: {
        lastActiveAt: new Date()
      }
    });

    await createNotification(tx, {
      userId: recipient.id,
      type: NotificationType.DIRECT_MESSAGE,
      payload: {
        title: "你收到了一条新私信",
        body: `${sender.profile?.nickname ?? sender.username}：${buildMessagePreview({
          messageType,
          contentText: normalizedText || null,
          contentJson: { mediaUrls }
        })}`,
        href: `/me/messages/${conversationId}`,
        actorUsername: sender.username,
        actorDisplayName: sender.profile?.nickname ?? sender.username,
        conversationId
      }
    });

    return {
      ok: true,
      message: "私信已发送。",
      conversationId
    } as const;
  });
}
