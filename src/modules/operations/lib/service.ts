import "server-only";

import {
  BadgeKind,
  BannerStatus,
  CircleStatus,
  ContentStatus,
  PointEventType,
  RecommendationSlotType,
  RecommendationTargetType,
  ReportStatus,
  UserStatus,
  type Prisma
} from "@/generated/prisma/client";
import {
  badgeSchema,
  bannerSchema,
  pointRuleSchema,
  recommendationSlotSchema
} from "@/modules/operations/lib/validation";
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

function parseOptionalDateInput(value: string | undefined, boundary: "start" | "end") {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value ? null : undefined;
  }

  const date = new Date(
    `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function buildActiveWindowFilter(now: Date) {
  return {
    AND: [
      {
        OR: [{ startsAt: null }, { startsAt: { lte: now } }]
      },
      {
        OR: [{ endsAt: null }, { endsAt: { gte: now } }]
      }
    ]
  };
}

function serializeWindow(input: {
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  return {
    startsAt: input.startsAt?.toISOString() ?? null,
    endsAt: input.endsAt?.toISOString() ?? null
  };
}

const adminBannerSelect = {
  id: true,
  title: true,
  subtitle: true,
  imageUrl: true,
  linkUrl: true,
  sortOrder: true,
  status: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.BannerSelect;

const adminRecommendationSlotSelect = {
  id: true,
  slotType: true,
  targetType: true,
  title: true,
  description: true,
  targetId: true,
  imageUrl: true,
  linkUrl: true,
  sortOrder: true,
  isActive: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.RecommendationSlotSelect;

const operationCircleTargetSelect = {
  id: true,
  name: true,
  slug: true,
  intro: true,
  followersCount: true,
  category: {
    select: {
      name: true
    }
  }
} satisfies Prisma.CircleSelect;

const adminPointRuleSelect = {
  id: true,
  eventType: true,
  name: true,
  description: true,
  points: true,
  dailyLimit: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.PointRuleSelect;

const adminBadgeSelect = {
  id: true,
  kind: true,
  name: true,
  description: true,
  iconUrl: true,
  grantCondition: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      userBadges: true
    }
  }
} satisfies Prisma.BadgeSelect;

export type AdminBannerItem = Prisma.BannerGetPayload<{
  select: typeof adminBannerSelect;
}>;

export type AdminRecommendationSlotItem = Prisma.RecommendationSlotGetPayload<{
  select: typeof adminRecommendationSlotSelect;
}>;

export type OperationCircleTarget = Prisma.CircleGetPayload<{
  select: typeof operationCircleTargetSelect;
}>;

export type AdminPointRuleItem = Prisma.PointRuleGetPayload<{
  select: typeof adminPointRuleSelect;
}>;

export type AdminBadgeItem = Prisma.BadgeGetPayload<{
  select: typeof adminBadgeSelect;
}>;

export async function getOperationOverview() {
  const now = new Date();
  const activeWindow = buildActiveWindowFilter(now);
  const [
    activeBannerCount,
    recommendedCircleCount,
    activityCount,
    topicCount
  ] = await Promise.all([
    prisma.banner.count({
      where: {
        status: BannerStatus.ACTIVE,
        ...activeWindow
      }
    }),
    prisma.recommendationSlot.count({
      where: {
        slotType: RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE,
        isActive: true,
        ...activeWindow
      }
    }),
    prisma.recommendationSlot.count({
      where: {
        slotType: RecommendationSlotType.HOMEPAGE_ACTIVITY,
        isActive: true,
        ...activeWindow
      }
    }),
    prisma.recommendationSlot.count({
      where: {
        slotType: RecommendationSlotType.HOMEPAGE_TOPIC,
        isActive: true,
        ...activeWindow
      }
    })
  ]);

  return {
    activeBannerCount,
    recommendedCircleCount,
    activityCount,
    topicCount
  };
}

export async function listBannersForAdmin() {
  return prisma.banner.findMany({
    select: adminBannerSelect,
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }]
  });
}

export async function listRecommendationSlotsForAdmin() {
  const items = await prisma.recommendationSlot.findMany({
    where: {
      slotType: {
        in: [
          RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE,
          RecommendationSlotType.HOMEPAGE_ACTIVITY,
          RecommendationSlotType.HOMEPAGE_TOPIC
        ]
      }
    },
    select: adminRecommendationSlotSelect,
    orderBy: [{ slotType: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }]
  });
  const circleIds = items
    .filter((item) => item.targetType === RecommendationTargetType.CIRCLE && item.targetId)
    .map((item) => item.targetId as string);
  const circles = circleIds.length
    ? await prisma.circle.findMany({
        where: {
          id: {
            in: circleIds
          }
        },
        select: {
          id: true,
          name: true,
          slug: true
        }
      })
    : [];
  const circleMap = new Map(circles.map((circle) => [circle.id, circle]));

  return items.map((item) => ({
    ...item,
    targetCircle:
      item.targetType === RecommendationTargetType.CIRCLE && item.targetId
        ? circleMap.get(item.targetId) ?? null
        : null
  }));
}

export async function listOperationCircleTargets() {
  return prisma.circle.findMany({
    where: {
      status: CircleStatus.ACTIVE,
      deletedAt: null
    },
    select: operationCircleTargetSelect,
    orderBy: [{ followersCount: "desc" }, { postsCount: "desc" }, { createdAt: "desc" }],
    take: 30
  });
}

export async function getHomeOperationContent() {
  const now = new Date();
  const activeWindow = buildActiveWindowFilter(now);
  const [banners, recommendedCircleSlots, activitySlots, topicSlots] = await Promise.all([
    prisma.banner.findMany({
      where: {
        status: BannerStatus.ACTIVE,
        ...activeWindow
      },
      select: adminBannerSelect,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 3
    }),
    prisma.recommendationSlot.findMany({
      where: {
        slotType: RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE,
        isActive: true,
        ...activeWindow
      },
      select: adminRecommendationSlotSelect,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 3
    }),
    prisma.recommendationSlot.findMany({
      where: {
        slotType: RecommendationSlotType.HOMEPAGE_ACTIVITY,
        isActive: true,
        ...activeWindow
      },
      select: adminRecommendationSlotSelect,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 3
    }),
    prisma.recommendationSlot.findMany({
      where: {
        slotType: RecommendationSlotType.HOMEPAGE_TOPIC,
        isActive: true,
        ...activeWindow
      },
      select: adminRecommendationSlotSelect,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 3
    })
  ]);

  const circleIds = recommendedCircleSlots
    .map((slot) => slot.targetId)
    .filter((value): value is string => Boolean(value));
  const circles = circleIds.length
    ? await prisma.circle.findMany({
        where: {
          id: {
            in: circleIds
          },
          status: CircleStatus.ACTIVE,
          deletedAt: null
        },
        select: operationCircleTargetSelect
      })
    : [];
  const circleMap = new Map(circles.map((circle) => [circle.id, circle]));

  return {
    banners,
    recommendedCircles: recommendedCircleSlots
      .map((slot) => ({
        ...slot,
        circle: slot.targetId ? circleMap.get(slot.targetId) ?? null : null
      }))
      .filter((item) => item.circle || item.linkUrl),
    activitySlots,
    topicSlots
  };
}

export async function upsertBanner(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = bannerSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查 Banner 配置后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const startsAtValue = parseOptionalDateInput(parsed.data.startsAt, "start");
  const endsAtValue = parseOptionalDateInput(parsed.data.endsAt, "end");

  if (startsAtValue === null || endsAtValue === null) {
    return {
      ok: false,
      message: "Banner 生效时间格式不正确。"
    };
  }

  const startsAt = startsAtValue ?? null;
  const endsAt = endsAtValue ?? null;

  if (startsAt && endsAt && endsAt < startsAt) {
    return {
      ok: false,
      message: "结束时间不能早于开始时间。"
    };
  }

  const payload = {
    title: parsed.data.title,
    subtitle: parsed.data.subtitle ?? null,
    imageUrl: parsed.data.imageUrl,
    linkUrl: parsed.data.linkUrl ?? null,
    sortOrder: parsed.data.sortOrder,
    status: parsed.data.status,
    startsAt,
    endsAt
  };

  const banner = await prisma.$transaction(async (tx) => {
    const record = parsed.data.id
      ? await tx.banner.update({
          where: {
            id: parsed.data.id
          },
          data: payload,
          select: {
            id: true,
            title: true
          }
        })
      : await tx.banner.create({
          data: payload,
          select: {
            id: true,
            title: true
          }
        });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: parsed.data.id ? "update_banner" : "create_banner",
        entityType: "banner",
        entityId: record.id,
        payloadJson: {
          title: payload.title,
          subtitle: payload.subtitle,
          imageUrl: payload.imageUrl,
          linkUrl: payload.linkUrl,
          sortOrder: payload.sortOrder,
          status: payload.status,
          ...serializeWindow({
            startsAt: payload.startsAt,
            endsAt: payload.endsAt
          })
        }
      }
    });

    return record;
  });

  return {
    ok: true,
    message: parsed.data.id
      ? `Banner《${banner.title}》已更新。`
      : `Banner《${banner.title}》已创建。`
  };
}

export async function upsertRecommendationSlot(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = recommendationSlotSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查推荐位配置后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const startsAtValue = parseOptionalDateInput(parsed.data.startsAt, "start");
  const endsAtValue = parseOptionalDateInput(parsed.data.endsAt, "end");

  if (startsAtValue === null || endsAtValue === null) {
    return {
      ok: false,
      message: "推荐位生效时间格式不正确。"
    };
  }

  const startsAt = startsAtValue ?? null;
  const endsAt = endsAtValue ?? null;

  if (startsAt && endsAt && endsAt < startsAt) {
    return {
      ok: false,
      message: "结束时间不能早于开始时间。"
    };
  }

  if (
    parsed.data.slotType === RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE &&
    !parsed.data.targetId
  ) {
    return {
      ok: false,
      message: "首页推荐圈子必须绑定目标圈子。"
    };
  }

  if (
    parsed.data.targetType === RecommendationTargetType.CIRCLE &&
    !parsed.data.targetId
  ) {
    return {
      ok: false,
      message: "圈子类型推荐位必须绑定圈子。"
    };
  }

  if (
    parsed.data.targetType === RecommendationTargetType.URL &&
    !parsed.data.linkUrl
  ) {
    return {
      ok: false,
      message: "链接类型推荐位必须填写跳转地址。"
    };
  }

  if (!parsed.data.targetId && !parsed.data.linkUrl) {
    return {
      ok: false,
      message: "请至少填写目标对象或跳转地址。"
    };
  }

  const payload = {
    slotType: parsed.data.slotType,
    targetType: parsed.data.targetType,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    targetId: parsed.data.targetId ?? null,
    imageUrl: parsed.data.imageUrl ?? null,
    linkUrl: parsed.data.linkUrl ?? null,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
    startsAt,
    endsAt
  };

  const slot = await prisma.$transaction(async (tx) => {
    const record = parsed.data.id
      ? await tx.recommendationSlot.update({
          where: {
            id: parsed.data.id
          },
          data: payload,
          select: {
            id: true,
            title: true
          }
        })
      : await tx.recommendationSlot.create({
          data: payload,
          select: {
            id: true,
            title: true
          }
        });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: parsed.data.id ? "update_recommendation_slot" : "create_recommendation_slot",
        entityType: "recommendation_slot",
        entityId: record.id,
        payloadJson: {
          slotType: payload.slotType,
          targetType: payload.targetType,
          title: payload.title,
          description: payload.description,
          targetId: payload.targetId,
          imageUrl: payload.imageUrl,
          linkUrl: payload.linkUrl,
          sortOrder: payload.sortOrder,
          isActive: payload.isActive,
          ...serializeWindow({
            startsAt: payload.startsAt,
            endsAt: payload.endsAt
          })
        }
      }
    });

    return record;
  });

  return {
    ok: true,
    message: parsed.data.id
      ? `推荐位《${slot.title}》已更新。`
      : `推荐位《${slot.title}》已创建。`
  };
}

export async function getPointRuleSummary() {
  const [totalCount, activeCount, limitedCount, topRule] = await Promise.all([
    prisma.pointRule.count(),
    prisma.pointRule.count({
      where: {
        isActive: true
      }
    }),
    prisma.pointRule.count({
      where: {
        dailyLimit: {
          not: null
        }
      }
    }),
    prisma.pointRule.findFirst({
      orderBy: [{ points: "desc" }, { updatedAt: "desc" }],
      select: {
        points: true
      }
    })
  ]);

  return {
    totalCount,
    activeCount,
    limitedCount,
    highestPoints: topRule?.points ?? 0
  };
}

export async function listPointRulesForAdmin() {
  return prisma.pointRule.findMany({
    select: adminPointRuleSelect,
    orderBy: [{ eventType: "asc" }, { points: "desc" }, { updatedAt: "desc" }]
  });
}

export async function upsertPointRule(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = pointRuleSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查积分规则配置后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const duplicated = await prisma.pointRule.findUnique({
    where: {
      name: parsed.data.name
    },
    select: {
      id: true
    }
  });

  if (duplicated && duplicated.id !== parsed.data.id) {
    return {
      ok: false,
      message: "已存在同名积分规则，请修改名称后重试。"
    };
  }

  const payload = {
    eventType: parsed.data.eventType,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    points: parsed.data.points,
    dailyLimit: parsed.data.dailyLimit ?? null,
    isActive: parsed.data.isActive
  };

  const rule = await prisma.$transaction(async (tx) => {
    const record = parsed.data.id
      ? await tx.pointRule.update({
          where: {
            id: parsed.data.id
          },
          data: payload,
          select: {
            id: true,
            name: true
          }
        })
      : await tx.pointRule.create({
          data: payload,
          select: {
            id: true,
            name: true
          }
        });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: parsed.data.id ? "update_point_rule" : "create_point_rule",
        entityType: "point_rule",
        entityId: record.id,
        payloadJson: payload
      }
    });

    return record;
  });

  return {
    ok: true,
    message: parsed.data.id
      ? `积分规则《${rule.name}》已更新。`
      : `积分规则《${rule.name}》已创建。`
  };
}

export async function getBadgeSummary() {
  const [totalCount, activeCount, badgeCount, titleCount] = await Promise.all([
    prisma.badge.count(),
    prisma.badge.count({
      where: {
        isActive: true
      }
    }),
    prisma.badge.count({
      where: {
        kind: BadgeKind.BADGE
      }
    }),
    prisma.badge.count({
      where: {
        kind: BadgeKind.TITLE
      }
    })
  ]);

  return {
    totalCount,
    activeCount,
    badgeCount,
    titleCount
  };
}

export async function listBadgesForAdmin() {
  return prisma.badge.findMany({
    select: adminBadgeSelect,
    orderBy: [{ kind: "asc" }, { updatedAt: "desc" }]
  });
}

export async function upsertBadge(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = badgeSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查勋章或头衔配置后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const duplicated = await prisma.badge.findUnique({
    where: {
      name: parsed.data.name
    },
    select: {
      id: true
    }
  });

  if (duplicated && duplicated.id !== parsed.data.id) {
    return {
      ok: false,
      message: "已存在同名勋章或头衔，请修改名称后重试。"
    };
  }

  const payload = {
    kind: parsed.data.kind,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    iconUrl: parsed.data.iconUrl ?? null,
    grantCondition: parsed.data.grantCondition ?? null,
    isActive: parsed.data.isActive
  };

  const badge = await prisma.$transaction(async (tx) => {
    const record = parsed.data.id
      ? await tx.badge.update({
          where: {
            id: parsed.data.id
          },
          data: payload,
          select: {
            id: true,
            name: true
          }
        })
      : await tx.badge.create({
          data: payload,
          select: {
            id: true,
            name: true
          }
        });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: parsed.data.id ? "update_badge" : "create_badge",
        entityType: "badge",
        entityId: record.id,
        payloadJson: payload
      }
    });

    return record;
  });

  return {
    ok: true,
    message: parsed.data.id
      ? `配置《${badge.name}》已更新。`
      : `配置《${badge.name}》已创建。`
  };
}

export async function getStatsOverview() {
  const [dailyStats, liveSummary] = await Promise.all([
    prisma.dailyStat.findMany({
      orderBy: [{ statDate: "desc" }],
      take: 14
    }),
    prisma.$transaction(async (tx) => {
      const [
        totalUsers,
        activeUsers,
        activeCircles,
        publishedPosts,
        publishedComments,
        pendingReports
      ] = await Promise.all([
        tx.user.count(),
        tx.user.count({
          where: {
            status: UserStatus.ACTIVE
          }
        }),
        tx.circle.count({
          where: {
            status: CircleStatus.ACTIVE,
            deletedAt: null
          }
        }),
        tx.post.count({
          where: {
            status: ContentStatus.PUBLISHED,
            deletedAt: null
          }
        }),
        tx.comment.count({
          where: {
            status: ContentStatus.PUBLISHED,
            deletedAt: null
          }
        }),
        tx.report.count({
          where: {
            status: {
              in: [ReportStatus.PENDING, ReportStatus.PROCESSING]
            }
          }
        })
      ]);

      return {
        totalUsers,
        activeUsers,
        activeCircles,
        publishedPosts,
        publishedComments,
        pendingReports
      };
    })
  ]);

  const recentSummary = dailyStats.slice(0, 7).reduce(
    (result, item) => ({
      newUsers: result.newUsers + item.newUsers,
      newPosts: result.newPosts + item.newPosts,
      newComments: result.newComments + item.newComments,
      newReports: result.newReports + item.newReports,
      activeUsersPeak: Math.max(result.activeUsersPeak, item.activeUsers)
    }),
    {
      newUsers: 0,
      newPosts: 0,
      newComments: 0,
      newReports: 0,
      activeUsersPeak: 0
    }
  );

  return {
    dailyStats,
    recentSummary,
    liveSummary
  };
}

export const pointEventOrder: PointEventType[] = [
  PointEventType.POST_CREATE,
  PointEventType.COMMENT_CREATE,
  PointEventType.RECEIVE_LIKE,
  PointEventType.RECEIVE_FAVORITE,
  PointEventType.MANUAL_ADJUST
];
