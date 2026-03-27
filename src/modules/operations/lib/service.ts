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
  assignUserBadgeSchema,
  badgeSchema,
  bannerSchema,
  pointRuleSchema,
  refreshDailyStatsSchema,
  removeUserBadgeSchema,
  recommendationSlotSchema,
  updateUserIdentitySchema
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

function toDateLabel(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function resolveDailyStatDateRange(rawDate?: string) {
  if (!rawDate) {
    const anchor = new Date();

    anchor.setHours(12, 0, 0, 0);

    const dayStart = new Date(anchor);
    const dayEnd = new Date(anchor);

    dayStart.setHours(0, 0, 0, 0);
    dayEnd.setHours(23, 59, 59, 999);

    return {
      statDate: anchor,
      dayStart,
      dayEnd,
      statDateLabel: toDateLabel(anchor)
    };
  }

  const [rawYear, rawMonth, rawDay] = rawDate.split("-");
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const anchor = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    Number.isNaN(anchor.getTime()) ||
    anchor.getFullYear() !== year ||
    anchor.getMonth() !== month - 1 ||
    anchor.getDate() !== day
  ) {
    return null;
  }

  const dayStart = new Date(anchor);
  const dayEnd = new Date(anchor);

  dayStart.setHours(0, 0, 0, 0);
  dayEnd.setHours(23, 59, 59, 999);

  return {
    statDate: anchor,
    dayStart,
    dayEnd,
    statDateLabel: toDateLabel(anchor)
  };
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

export async function listActiveBadgesForAssignment() {
  return prisma.badge.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      kind: true,
      name: true,
      description: true
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }]
  });
}

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

export async function assignBadgeToUser(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = assignUserBadgeSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查授予信息后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const expiresAtValue = parseOptionalDateInput(parsed.data.expiresAt, "end");

  if (expiresAtValue === null) {
    return {
      ok: false,
      message: "过期时间格式不正确。"
    };
  }

  const [user, badge, existing] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: parsed.data.userId
      },
      select: {
        id: true,
        username: true
      }
    }),
    prisma.badge.findUnique({
      where: {
        id: parsed.data.badgeId
      },
      select: {
        id: true,
        name: true,
        kind: true,
        isActive: true
      }
    }),
    prisma.userBadge.findFirst({
      where: {
        userId: parsed.data.userId,
        badgeId: parsed.data.badgeId
      },
      select: {
        id: true
      }
    })
  ]);

  if (!user) {
    return {
      ok: false,
      message: "未找到要授予身份的用户。"
    };
  }

  if (!badge || !badge.isActive) {
    return {
      ok: false,
      message: "目标勋章或头衔不存在，或当前未启用。"
    };
  }

  if (existing) {
    return {
      ok: false,
      message: "该用户已经拥有这个勋章或头衔。"
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userBadge.create({
      data: {
        userId: user.id,
        badgeId: badge.id,
        grantedById: adminId,
        reason: parsed.data.reason ?? null,
        expiresAt: expiresAtValue ?? null
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "assign_user_badge",
        entityType: "user_badge",
        entityId: `${user.id}:${badge.id}`,
        payloadJson: {
          userId: user.id,
          username: user.username,
          badgeId: badge.id,
          badgeName: badge.name,
          badgeKind: badge.kind,
          reason: parsed.data.reason ?? null,
          expiresAt: expiresAtValue?.toISOString() ?? null
        }
      }
    });
  });

  return {
    ok: true,
    message: `已向 @${user.username} 授予${badge.kind === BadgeKind.TITLE ? "头衔" : "勋章"}《${badge.name}》。`,
    username: user.username
  };
}

export async function removeUserBadge(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = removeUserBadgeSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查授予记录后再操作。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const record = await prisma.userBadge.findUnique({
    where: {
      id: parsed.data.userBadgeId
    },
    select: {
      id: true,
      userId: true,
      badgeId: true,
      user: {
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              featuredBadgeId: true,
              titleBadgeId: true
            }
          }
        }
      },
      badge: {
        select: {
          id: true,
          name: true,
          kind: true
        }
      }
    }
  });

  if (!record || record.userId !== parsed.data.userId) {
    return {
      ok: false,
      message: "未找到对应的授予记录。"
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userBadge.delete({
      where: {
        id: record.id
      }
    });

    if (
      record.user.profile?.featuredBadgeId === record.badge.id ||
      record.user.profile?.titleBadgeId === record.badge.id
    ) {
      await tx.userProfile.update({
        where: {
          userId: record.user.id
        },
        data: {
          ...(record.user.profile?.featuredBadgeId === record.badge.id
            ? { featuredBadgeId: null }
            : {}),
          ...(record.user.profile?.titleBadgeId === record.badge.id
            ? { titleBadgeId: null }
            : {})
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "remove_user_badge",
        entityType: "user_badge",
        entityId: record.id,
        payloadJson: {
          userId: record.user.id,
          username: record.user.username,
          badgeId: record.badge.id,
          badgeName: record.badge.name,
          badgeKind: record.badge.kind
        }
      }
    });
  });

  return {
    ok: true,
    message: `已移除 @${record.user.username} 的${record.badge.kind === BadgeKind.TITLE ? "头衔" : "勋章"}《${record.badge.name}》。`,
    username: record.user.username
  };
}

export async function updateUserIdentityDisplay(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = updateUserIdentitySchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查展示位配置后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: parsed.data.userId
    },
    select: {
      id: true,
      username: true
    }
  });

  if (!user) {
    return {
      ok: false,
      message: "未找到对应的用户。"
    };
  }

  const grantedBadges = await prisma.userBadge.findMany({
    where: {
      userId: user.id
    },
    select: {
      badgeId: true,
      badge: {
        select: {
          kind: true
        }
      }
    }
  });

  const grantedBadgeIds = new Set(grantedBadges.map((item) => item.badgeId));
  const badgeKindMap = new Map(grantedBadges.map((item) => [item.badgeId, item.badge.kind]));

  if (parsed.data.featuredBadgeId && !grantedBadgeIds.has(parsed.data.featuredBadgeId)) {
    return {
      ok: false,
      message: "精选勋章必须来自用户已获得的勋章列表。"
    };
  }

  if (
    parsed.data.featuredBadgeId &&
    badgeKindMap.get(parsed.data.featuredBadgeId) !== BadgeKind.BADGE
  ) {
    return {
      ok: false,
      message: "精选勋章位置只能选择勋章类型。"
    };
  }

  if (parsed.data.titleBadgeId && !grantedBadgeIds.has(parsed.data.titleBadgeId)) {
    return {
      ok: false,
      message: "当前头衔必须来自用户已获得的头衔列表。"
    };
  }

  if (parsed.data.titleBadgeId && badgeKindMap.get(parsed.data.titleBadgeId) !== BadgeKind.TITLE) {
    return {
      ok: false,
      message: "当前头衔位置只能选择头衔类型。"
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.upsert({
      where: {
        userId: user.id
      },
      update: {
        featuredBadgeId: parsed.data.featuredBadgeId ?? null,
        titleBadgeId: parsed.data.titleBadgeId ?? null
      },
      create: {
        userId: user.id,
        nickname: user.username,
        featuredBadgeId: parsed.data.featuredBadgeId ?? null,
        titleBadgeId: parsed.data.titleBadgeId ?? null
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "update_user_identity_display",
        entityType: "user_profile",
        entityId: user.id,
        payloadJson: {
          userId: user.id,
          username: user.username,
          featuredBadgeId: parsed.data.featuredBadgeId ?? null,
          titleBadgeId: parsed.data.titleBadgeId ?? null
        }
      }
    });
  });

  return {
    ok: true,
    message: `已更新 @${user.username} 的公开身份展示。`,
    username: user.username
  };
}

export async function syncDailyStatsSnapshot(
  adminId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = refreshDailyStatsSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查统计日期后再重试。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const resolvedRange = resolveDailyStatDateRange(parsed.data.statDate);

  if (!resolvedRange) {
    return {
      ok: false,
      message: "统计日期格式不正确。"
    };
  }

  const snapshot = await prisma.$transaction(async (tx) => {
    const [newUsers, newPosts, newComments, newReports, activeUsers] = await Promise.all([
      tx.user.count({
        where: {
          createdAt: {
            gte: resolvedRange.dayStart,
            lte: resolvedRange.dayEnd
          }
        }
      }),
      tx.post.count({
        where: {
          status: ContentStatus.PUBLISHED,
          deletedAt: null,
          createdAt: {
            gte: resolvedRange.dayStart,
            lte: resolvedRange.dayEnd
          }
        }
      }),
      tx.comment.count({
        where: {
          status: ContentStatus.PUBLISHED,
          deletedAt: null,
          createdAt: {
            gte: resolvedRange.dayStart,
            lte: resolvedRange.dayEnd
          }
        }
      }),
      tx.report.count({
        where: {
          createdAt: {
            gte: resolvedRange.dayStart,
            lte: resolvedRange.dayEnd
          }
        }
      }),
      tx.user.count({
        where: {
          status: UserStatus.ACTIVE,
          OR: [
            {
              profile: {
                is: {
                  lastActiveAt: {
                    gte: resolvedRange.dayStart,
                    lte: resolvedRange.dayEnd
                  }
                }
              }
            },
            {
              createdAt: {
                gte: resolvedRange.dayStart,
                lte: resolvedRange.dayEnd
              }
            }
          ]
        }
      })
    ]);

    const dailyStat = await tx.dailyStat.upsert({
      where: {
        statDate: resolvedRange.statDate
      },
      update: {
        newUsers,
        newPosts,
        newComments,
        newReports,
        activeUsers
      },
      create: {
        statDate: resolvedRange.statDate,
        newUsers,
        newPosts,
        newComments,
        newReports,
        activeUsers
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "sync_daily_stats_snapshot",
        entityType: "daily_stat",
        entityId: dailyStat.id,
        payloadJson: {
          statDate: resolvedRange.statDateLabel,
          dayStart: resolvedRange.dayStart.toISOString(),
          dayEnd: resolvedRange.dayEnd.toISOString(),
          newUsers,
          newPosts,
          newComments,
          newReports,
          activeUsers
        }
      }
    });

    return dailyStat;
  });

  return {
    ok: true,
    message: `已同步 ${resolvedRange.statDateLabel} 的 daily_stats 快照。`,
    statDate: resolvedRange.statDateLabel,
    id: snapshot.id
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
