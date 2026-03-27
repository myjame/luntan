import "server-only";

import {
  PointEventType,
  type Prisma
} from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

type GrowthClient = Prisma.TransactionClient | typeof prisma;

const pointLedgerSelect = {
  id: true,
  eventType: true,
  delta: true,
  balanceAfter: true,
  referenceType: true,
  referenceId: true,
  note: true,
  createdAt: true,
  rule: {
    select: {
      id: true,
      name: true
    }
  },
  operator: {
    select: {
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  }
} satisfies Prisma.PointLedgerSelect;

const userGrantedBadgeSelect = {
  id: true,
  reason: true,
  grantedAt: true,
  expiresAt: true,
  badge: {
    select: {
      id: true,
      name: true,
      description: true,
      iconUrl: true,
      kind: true
    }
  },
  grantedBy: {
    select: {
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  }
} satisfies Prisma.UserBadgeSelect;

function toDisplayName(user: {
  username: string;
  profile?: {
    nickname?: string | null;
  } | null;
}) {
  return user.profile?.nickname ?? user.username;
}

function getDayRange(now: Date) {
  const start = new Date(now);
  const end = new Date(now);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function resolveGrowthLevel(points: number) {
  const normalizedPoints = Math.max(0, Math.floor(points));
  const level = Math.floor(normalizedPoints / 100) + 1;
  const currentLevelMinPoints = (level - 1) * 100;
  const nextLevelMinPoints = level * 100;
  const pointsIntoLevel = normalizedPoints - currentLevelMinPoints;
  const pointsNeeded = Math.max(0, nextLevelMinPoints - normalizedPoints);
  const progressPercent =
    nextLevelMinPoints === currentLevelMinPoints
      ? 100
      : Math.max(0, Math.min(100, Math.round((pointsIntoLevel / 100) * 100)));

  return {
    level,
    normalizedPoints,
    currentLevelMinPoints,
    nextLevelMinPoints,
    pointsIntoLevel,
    pointsNeeded,
    progressPercent
  };
}

async function applyPointEvent(
  client: GrowthClient,
  input: {
    userId: string;
    eventType: PointEventType;
    referenceType: string;
    referenceId: string;
    operatorId?: string | null;
    note?: string | null;
  }
) {
  const profile = await client.userProfile.findUnique({
    where: {
      userId: input.userId
    },
    select: {
      points: true
    }
  });

  if (!profile) {
    return {
      appliedCount: 0,
      balanceAfter: 0
    };
  }

  const rules = await client.pointRule.findMany({
    where: {
      eventType: input.eventType,
      isActive: true
    },
    orderBy: [{ createdAt: "asc" }]
  });

  if (rules.length === 0) {
    return {
      appliedCount: 0,
      balanceAfter: profile.points
    };
  }

  const now = new Date();
  const dayRange = getDayRange(now);
  let balanceAfter = profile.points;
  let appliedCount = 0;

  for (const rule of rules) {
    const existingLedger = await client.pointLedger.findFirst({
      where: {
        userId: input.userId,
        ruleId: rule.id,
        referenceType: input.referenceType,
        referenceId: input.referenceId
      },
      select: {
        id: true
      }
    });

    if (existingLedger) {
      continue;
    }

    if (rule.dailyLimit) {
      const todayCount = await client.pointLedger.count({
        where: {
          userId: input.userId,
          ruleId: rule.id,
          createdAt: {
            gte: dayRange.start,
            lte: dayRange.end
          }
        }
      });

      if (todayCount >= rule.dailyLimit) {
        continue;
      }
    }

    balanceAfter += rule.points;
    appliedCount += 1;

    await client.pointLedger.create({
      data: {
        userId: input.userId,
        ruleId: rule.id,
        operatorId: input.operatorId ?? null,
        eventType: input.eventType,
        delta: rule.points,
        balanceAfter,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note ?? rule.description ?? null
      }
    });
  }

  if (appliedCount > 0 && balanceAfter !== profile.points) {
    await client.userProfile.update({
      where: {
        userId: input.userId
      },
      data: {
        points: balanceAfter
      }
    });
  }

  return {
    appliedCount,
    balanceAfter
  };
}

export async function awardPostCreatePoints(
  client: GrowthClient,
  input: {
    userId: string;
    postId: string;
    postTitle: string;
  }
) {
  return applyPointEvent(client, {
    userId: input.userId,
    eventType: PointEventType.POST_CREATE,
    referenceType: "post",
    referenceId: input.postId,
    note: `发布帖子《${input.postTitle}》`
  });
}

export async function awardCommentCreatePoints(
  client: GrowthClient,
  input: {
    userId: string;
    commentId: string;
    postId: string;
    postTitle: string;
  }
) {
  return applyPointEvent(client, {
    userId: input.userId,
    eventType: PointEventType.COMMENT_CREATE,
    referenceType: "comment",
    referenceId: input.commentId,
    note: `评论帖子《${input.postTitle}》`
  });
}

export async function awardReceiveLikePoints(
  client: GrowthClient,
  input: {
    userId: string;
    actorId: string;
    postId: string;
    postTitle: string;
  }
) {
  if (input.userId === input.actorId) {
    return {
      appliedCount: 0,
      balanceAfter: 0
    };
  }

  return applyPointEvent(client, {
    userId: input.userId,
    eventType: PointEventType.RECEIVE_LIKE,
    referenceType: "post_like",
    referenceId: `${input.postId}:${input.actorId}`,
    note: `帖子《${input.postTitle}》收到点赞`
  });
}

export async function awardReceiveFavoritePoints(
  client: GrowthClient,
  input: {
    userId: string;
    actorId: string;
    postId: string;
    postTitle: string;
  }
) {
  if (input.userId === input.actorId) {
    return {
      appliedCount: 0,
      balanceAfter: 0
    };
  }

  return applyPointEvent(client, {
    userId: input.userId,
    eventType: PointEventType.RECEIVE_FAVORITE,
    referenceType: "post_favorite",
    referenceId: `${input.postId}:${input.actorId}`,
    note: `帖子《${input.postTitle}》被收藏`
  });
}

export async function listPointLedgersByUserId(userId: string, take = 20) {
  return prisma.pointLedger.findMany({
    where: {
      userId
    },
    select: pointLedgerSelect,
    orderBy: [{ createdAt: "desc" }],
    take: Math.max(1, Math.min(take, 50))
  });
}

export async function listGrantedBadgesByUserId(userId: string, take = 12) {
  return prisma.userBadge.findMany({
    where: {
      userId,
      badge: {
        is: {
          isActive: true
        }
      }
    },
    select: userGrantedBadgeSelect,
    orderBy: [{ grantedAt: "desc" }],
    take: Math.max(1, Math.min(take, 24))
  });
}

export async function getGrowthDashboard(userId: string) {
  const [profile, ledgers, badges] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            points: true,
            featuredBadge: {
              select: {
                name: true
              }
            },
            titleBadge: {
              select: {
                name: true
              }
            }
          }
        }
      }
    }),
    listPointLedgersByUserId(userId, 24),
    listGrantedBadgesByUserId(userId, 12)
  ]);

  if (!profile) {
    return null;
  }

  const points = profile.profile?.points ?? 0;

  return {
    user: {
      id: profile.id,
      username: profile.username,
      points,
      featuredBadgeName: profile.profile?.featuredBadge?.name ?? null,
      titleBadgeName: profile.profile?.titleBadge?.name ?? null
    },
    level: resolveGrowthLevel(points),
    ledgers: ledgers.map((item) => ({
      ...item,
      operatorDisplayName: item.operator ? toDisplayName(item.operator) : null
    })),
    badges: badges.map((item) => ({
      ...item,
      grantedByDisplayName: item.grantedBy ? toDisplayName(item.grantedBy) : null
    }))
  };
}
