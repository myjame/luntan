import "server-only";

import {
  CircleManagerRole,
  CircleStatus,
  ContentStatus,
  ModerationActionType,
  NotificationType,
  ReportTargetType,
  UserStatus,
  WorkflowStatus,
  type Prisma,
  type UserRole
} from "@/generated/prisma/client";
import { createNotification } from "@/modules/notifications/lib/service";
import { prisma } from "@/server/db/prisma";

import { circleApplicationSchema, circleManagerSchema, circleProfileSchema } from "@/modules/community/lib/validation";

function validationErrors(error: unknown) {
  if (!(error instanceof Error) || !("issues" in error)) {
    return undefined;
  }

  const issues = (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues;

  return Object.fromEntries(
    issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])
  ) as Record<string, string>;
}

const publicCircleSelect = {
  id: true,
  name: true,
  slug: true,
  coverUrl: true,
  iconUrl: true,
  intro: true,
  announcement: true,
  allowAnonymous: true,
  followersCount: true,
  postsCount: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  owner: {
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  }
} satisfies Prisma.CircleSelect;

const adminCircleApplicationSelect = {
  id: true,
  name: true,
  slug: true,
  coverUrl: true,
  iconUrl: true,
  intro: true,
  rules: true,
  allowAnonymous: true,
  status: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  applicant: {
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          nickname: true,
          bio: true
        }
      }
    }
  },
  reviewer: {
    select: {
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  },
  circle: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true
    }
  }
} satisfies Prisma.CircleApplicationSelect;

const adminCircleSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  intro: true,
  allowAnonymous: true,
  followersCount: true,
  postsCount: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  owner: {
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  },
  managers: {
    select: {
      id: true,
      role: true,
      user: {
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
} satisfies Prisma.CircleSelect;

export type PublicCircleListItem = Prisma.CircleGetPayload<{
  select: typeof publicCircleSelect;
}>;

export type CircleApplicationListItem = Prisma.CircleApplicationGetPayload<{
  select: typeof adminCircleApplicationSelect;
}>;

export type AdminCircleListItem = Prisma.CircleGetPayload<{
  select: typeof adminCircleSelect;
}>;

export type PaginatedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const circleStatusOptions = [
  { value: "ACTIVE", label: "已上线" },
  { value: "PENDING_REVIEW", label: "待审核" },
  { value: "REJECTED", label: "已拒绝" },
  { value: "ARCHIVED", label: "已归档" },
  { value: "DISABLED", label: "已停用" }
] as const;

export const workflowStatusOptions = [
  { value: "PENDING", label: "待审核" },
  { value: "APPROVED", label: "已通过" },
  { value: "REJECTED", label: "已拒绝" },
  { value: "CANCELLED", label: "已取消" }
] as const;

const circleStatusMeta: Record<
  (typeof circleStatusOptions)[number]["value"],
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "已上线",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
  },
  PENDING_REVIEW: {
    label: "待审核",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-800"
  },
  REJECTED: {
    label: "已拒绝",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-800"
  },
  ARCHIVED: {
    label: "已归档",
    className: "border-stone-500/20 bg-stone-500/10 text-stone-700"
  },
  DISABLED: {
    label: "已停用",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-700"
  }
};

const workflowStatusMeta: Record<
  (typeof workflowStatusOptions)[number]["value"],
  { label: string; className: string }
> = {
  PENDING: {
    label: "待审核",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-800"
  },
  APPROVED: {
    label: "已通过",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
  },
  REJECTED: {
    label: "已拒绝",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-800"
  },
  CANCELLED: {
    label: "已取消",
    className: "border-stone-500/20 bg-stone-500/10 text-stone-700"
  }
};

function normalizePageNumber(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function buildCircleSearchConditions(query: string): Prisma.CircleWhereInput[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  return [
    {
      name: {
        contains: trimmed,
        mode: "insensitive"
      }
    },
    {
      slug: {
        contains: trimmed,
        mode: "insensitive"
      }
    },
    {
      intro: {
        contains: trimmed,
        mode: "insensitive"
      }
    },
    {
      category: {
        is: {
          name: {
            contains: trimmed,
            mode: "insensitive"
          }
        }
      }
    }
  ];
}

function buildCircleApplicationSearchConditions(query: string): Prisma.CircleApplicationWhereInput[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  return [
    {
      name: {
        contains: trimmed,
        mode: "insensitive"
      }
    },
    {
      slug: {
        contains: trimmed,
        mode: "insensitive"
      }
    },
    {
      applicant: {
        is: {
          OR: [
            {
              username: {
                contains: trimmed,
                mode: "insensitive"
              }
            },
            {
              profile: {
                is: {
                  nickname: {
                    contains: trimmed,
                    mode: "insensitive"
                  }
                }
              }
            }
          ]
        }
      }
    }
  ];
}

async function paginateCircleApplications(args: {
  where: Prisma.CircleApplicationWhereInput;
  orderBy: Prisma.CircleApplicationOrderByWithRelationInput[];
  page?: number;
  pageSize: number;
}): Promise<PaginatedResult<CircleApplicationListItem>> {
  const totalCount = await prisma.circleApplication.count({
    where: args.where
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / args.pageSize));
  const page = Math.min(normalizePageNumber(args.page), totalPages);
  const items = await prisma.circleApplication.findMany({
    where: args.where,
    select: adminCircleApplicationSelect,
    orderBy: args.orderBy,
    skip: (page - 1) * args.pageSize,
    take: args.pageSize
  });

  return {
    items,
    totalCount,
    page,
    pageSize: args.pageSize,
    totalPages
  };
}

async function paginateCircles(args: {
  where: Prisma.CircleWhereInput;
  orderBy: Prisma.CircleOrderByWithRelationInput[];
  page?: number;
  pageSize: number;
}): Promise<PaginatedResult<AdminCircleListItem>> {
  const totalCount = await prisma.circle.count({
    where: args.where
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / args.pageSize));
  const page = Math.min(normalizePageNumber(args.page), totalPages);
  const items = await prisma.circle.findMany({
    where: args.where,
    select: adminCircleSelect,
    orderBy: args.orderBy,
    skip: (page - 1) * args.pageSize,
    take: args.pageSize
  });

  return {
    items,
    totalCount,
    page,
    pageSize: args.pageSize,
    totalPages
  };
}

function getActorDisplayName(user: {
  username: string;
  profile?: { nickname: string | null } | null;
}) {
  return user.profile?.nickname ?? user.username;
}

async function getCircleAccessContext(input: {
  circleId?: string;
  slug?: string;
  actorId: string;
  actorRole: UserRole;
}) {
  const circle = await prisma.circle.findFirst({
    where: input.circleId
      ? {
          id: input.circleId
        }
      : {
          slug: input.slug
        },
    include: {
      category: true,
      owner: {
        include: {
          profile: true
        }
      },
      managers: {
        include: {
          user: {
            include: {
              profile: true
            }
          }
        },
        orderBy: [{ createdAt: "asc" }]
      }
    }
  });

  if (!circle) {
    return null;
  }

  const relation = circle.managers.find((item) => item.userId === input.actorId) ?? null;
  const isOwner = circle.ownerId === input.actorId || relation?.role === CircleManagerRole.OWNER;
  const canManage =
    input.actorRole === "SUPER_ADMIN" || isOwner || Boolean(relation?.role === CircleManagerRole.MANAGER);
  const canManageManagers = input.actorRole === "SUPER_ADMIN" || isOwner;

  return {
    circle,
    relation,
    canManage,
    canManageManagers,
    actorLabel:
      input.actorRole === "SUPER_ADMIN"
        ? "SUPER_ADMIN"
        : isOwner
          ? "OWNER"
          : relation?.role ?? null
  };
}

export function getCircleStatusMeta(status: (typeof circleStatusOptions)[number]["value"]) {
  return circleStatusMeta[status];
}

export function getWorkflowStatusMeta(status: (typeof workflowStatusOptions)[number]["value"]) {
  return workflowStatusMeta[status];
}

export async function listCircleCategories() {
  return prisma.circleCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
}

export async function listPublicCircles(filters?: {
  query?: string;
  categorySlug?: string;
  take?: number;
}) {
  const searchConditions = buildCircleSearchConditions(filters?.query ?? "");

  return prisma.circle.findMany({
    where: {
      status: CircleStatus.ACTIVE,
      deletedAt: null,
      ...(filters?.categorySlug
        ? {
            category: {
              is: {
                slug: filters.categorySlug
              }
            }
          }
        : {}),
      ...(searchConditions.length > 0
        ? {
            OR: searchConditions
          }
        : {})
    },
    select: publicCircleSelect,
    orderBy: [
      { followersCount: "desc" },
      { postsCount: "desc" },
      { createdAt: "desc" }
    ],
    take: Math.min(filters?.take ?? 18, 30)
  });
}

export async function listFollowedCircleIds(userId: string, circleIds: string[]) {
  if (circleIds.length === 0) {
    return [];
  }

  const follows = await prisma.circleFollow.findMany({
    where: {
      userId,
      circleId: {
        in: circleIds
      }
    },
    select: {
      circleId: true
    }
  });

  return follows.map((item) => item.circleId);
}

export async function getPublicCircleDetail(
  slug: string,
  currentUserId?: string | null,
  currentUserRole?: UserRole | null
) {
  const circle = await prisma.circle.findUnique({
    where: {
      slug
    },
    include: {
      category: true,
      owner: {
        include: {
          profile: true
        }
      },
      managers: {
        include: {
          user: {
            include: {
              profile: true
            }
          }
        },
        orderBy: [{ createdAt: "asc" }]
      }
    }
  });

  if (!circle || circle.status !== CircleStatus.ACTIVE || circle.deletedAt) {
    return null;
  }

  const [isFollowing, accessContext] = await Promise.all([
    currentUserId
      ? prisma.circleFollow.findUnique({
          where: {
            circleId_userId: {
              circleId: circle.id,
              userId: currentUserId
            }
          },
          select: {
            id: true
          }
        })
      : Promise.resolve(null),
    currentUserId
      ? getCircleAccessContext({
          slug,
          actorId: currentUserId,
          actorRole: currentUserRole ?? "USER"
        })
      : Promise.resolve(null)
  ]);

  return {
    circle,
    isFollowing: Boolean(isFollowing),
    canManage: Boolean(accessContext?.canManage)
  };
}

export async function listCurrentUserCircleApplications(userId: string) {
  return prisma.circleApplication.findMany({
    where: {
      applicantId: userId
    },
    select: adminCircleApplicationSelect,
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function submitCircleApplication(
  applicant: {
    id: string;
    username: string;
    profile?: { nickname: string | null } | null;
  },
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = circleApplicationSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查圈子申请信息后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const [category, existingCircle, existingPendingApplication] = await Promise.all([
    prisma.circleCategory.findUnique({
      where: {
        id: parsed.data.categoryId
      }
    }),
    prisma.circle.findFirst({
      where: {
        OR: [
          {
            slug: parsed.data.slug
          },
          {
            categoryId: parsed.data.categoryId,
            name: parsed.data.name
          }
        ],
        deletedAt: null
      },
      select: {
        slug: true,
        name: true
      }
    }),
    prisma.circleApplication.findFirst({
      where: {
        status: WorkflowStatus.PENDING,
        OR: [
          {
            slug: parsed.data.slug
          },
          {
            applicantId: applicant.id,
            categoryId: parsed.data.categoryId,
            name: parsed.data.name
          }
        ]
      },
      select: {
        slug: true,
        name: true
      }
    })
  ]);

  if (!category) {
    return {
      ok: false,
      message: "未找到对应的圈子分类。"
    };
  }

  if (existingCircle?.slug === parsed.data.slug) {
    return {
      ok: false,
      message: "这个圈子 slug 已经被占用。",
      fieldErrors: {
        slug: "圈子 slug 已存在"
      }
    };
  }

  if (existingCircle?.name === parsed.data.name) {
    return {
      ok: false,
      message: "该分类下已经有同名圈子。",
      fieldErrors: {
        name: "该分类下圈子名称已存在"
      }
    };
  }

  if (existingPendingApplication?.slug === parsed.data.slug) {
    return {
      ok: false,
      message: "这个圈子 slug 已在审核队列中。",
      fieldErrors: {
        slug: "圈子 slug 已在审核队列中"
      }
    };
  }

  await prisma.circleApplication.create({
    data: {
      applicantId: applicant.id,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      coverUrl: parsed.data.coverUrl || null,
      iconUrl: parsed.data.iconUrl || null,
      intro: parsed.data.intro,
      rules: parsed.data.rules,
      allowAnonymous: parsed.data.allowAnonymous
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: applicant.id,
      action: "submit_circle_application",
      entityType: "circle_application",
      payloadJson: {
        applicant: getActorDisplayName(applicant),
        category: category.name,
        name: parsed.data.name,
        slug: parsed.data.slug
      }
    }
  });

  return {
    ok: true,
    message: "圈子申请已提交，后续会进入管理员审核。"
  };
}

export async function followCircle(userId: string, slug: string) {
  const circle = await prisma.circle.findFirst({
    where: {
      slug,
      status: CircleStatus.ACTIVE,
      deletedAt: null
    },
    select: {
      id: true,
      slug: true,
      name: true
    }
  });

  if (!circle) {
    return {
      ok: false,
      message: "未找到可关注的圈子。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const existingFollow = await tx.circleFollow.findUnique({
      where: {
        circleId_userId: {
          circleId: circle.id,
          userId
        }
      }
    });

    if (existingFollow) {
      return {
        ok: true,
        message: `你已经关注了 ${circle.name}。`
      } as const;
    }

    await tx.circleFollow.create({
      data: {
        circleId: circle.id,
        userId
      }
    });

    await tx.circle.update({
      where: {
        id: circle.id
      },
      data: {
        followersCount: {
          increment: 1
        }
      }
    });

    return {
      ok: true,
      message: `已关注 ${circle.name}。`
    } as const;
  });
}

export async function unfollowCircle(userId: string, slug: string) {
  const circle = await prisma.circle.findFirst({
    where: {
      slug,
      status: CircleStatus.ACTIVE,
      deletedAt: null
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!circle) {
    return {
      ok: false,
      message: "未找到该圈子。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const existingFollow = await tx.circleFollow.findUnique({
      where: {
        circleId_userId: {
          circleId: circle.id,
          userId
        }
      }
    });

    if (!existingFollow) {
      return {
        ok: true,
        message: `你当前没有关注 ${circle.name}。`
      } as const;
    }

    await tx.circleFollow.delete({
      where: {
        circleId_userId: {
          circleId: circle.id,
          userId
        }
      }
    });

    await tx.circle.update({
      where: {
        id: circle.id
      },
      data: {
        followersCount: {
          decrement: 1
        }
      }
    });

    return {
      ok: true,
      message: `已取消关注 ${circle.name}。`
    } as const;
  });
}

export async function getCircleReviewSummary() {
  const [pendingApplicationCount, approvedApplicationCount, rejectedApplicationCount, activeCircleCount] =
    await Promise.all([
      prisma.circleApplication.count({
        where: {
          status: WorkflowStatus.PENDING
        }
      }),
      prisma.circleApplication.count({
        where: {
          status: WorkflowStatus.APPROVED
        }
      }),
      prisma.circleApplication.count({
        where: {
          status: WorkflowStatus.REJECTED
        }
      }),
      prisma.circle.count({
        where: {
          status: CircleStatus.ACTIVE,
          deletedAt: null
        }
      })
    ]);

  return {
    pendingApplicationCount,
    approvedApplicationCount,
    rejectedApplicationCount,
    activeCircleCount
  };
}

export async function listPendingCircleApplications(filters?: {
  query?: string;
  categorySlug?: string;
  page?: number;
  take?: number;
}) {
  const searchConditions = buildCircleApplicationSearchConditions(filters?.query ?? "");

  return paginateCircleApplications({
    where: {
      status: WorkflowStatus.PENDING,
      ...(filters?.categorySlug
        ? {
            category: {
              is: {
                slug: filters.categorySlug
              }
            }
          }
        : {}),
      ...(searchConditions.length > 0
        ? {
            OR: searchConditions
          }
        : {})
    },
    orderBy: [{ createdAt: "asc" }],
    page: filters?.page,
    pageSize: Math.min(filters?.take ?? 8, 20)
  });
}

export async function listCirclesForAdmin(filters?: {
  query?: string;
  categorySlug?: string;
  status?: CircleStatus;
  page?: number;
  take?: number;
}) {
  const searchConditions = buildCircleSearchConditions(filters?.query ?? "");

  return paginateCircles({
    where: {
      ...(filters?.status
        ? {
            status: filters.status
          }
        : {}),
      ...(filters?.categorySlug
        ? {
            category: {
              is: {
                slug: filters.categorySlug
              }
            }
          }
        : {}),
      ...(searchConditions.length > 0
        ? {
            OR: searchConditions
          }
        : {})
    },
    orderBy: [{ createdAt: "desc" }, { followersCount: "desc" }],
    page: filters?.page,
    pageSize: Math.min(filters?.take ?? 10, 30)
  });
}

export async function reviewCircleApplication(
  admin: {
    id: string;
    username: string;
    profile?: { nickname: string | null } | null;
  },
  input: {
    applicationId: string;
    decision: "APPROVE" | "REJECT";
    reviewNote?: string | null;
  }
) {
  const normalizedNote = input.reviewNote?.trim() || null;

  if (input.decision === "REJECT" && !normalizedNote) {
    return {
      ok: false,
      message: "拒绝圈子申请时请填写审核说明。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const application = await tx.circleApplication.findUnique({
      where: {
        id: input.applicationId
      },
      include: {
        category: true,
        applicant: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!application) {
      return {
        ok: false,
        message: "未找到对应的圈子申请。"
      } as const;
    }

    if (application.status !== WorkflowStatus.PENDING) {
      return {
        ok: false,
        message: "该圈子申请已经被处理，请刷新页面后重试。"
      } as const;
    }

    const existingCircle = await tx.circle.findUnique({
      where: {
        slug: application.slug
      },
      select: {
        id: true
      }
    });

    if (input.decision === "APPROVE" && existingCircle) {
      return {
        ok: false,
        message: "已有同 slug 的圈子存在，无法重复批准。"
      } as const;
    }

    const reviewedAt = new Date();
    let createdCircleId: string | null = null;

    if (input.decision === "APPROVE") {
      const createdCircle = await tx.circle.create({
        data: {
          categoryId: application.categoryId,
          ownerId: application.applicantId,
          name: application.name,
          slug: application.slug,
          coverUrl: application.coverUrl,
          iconUrl: application.iconUrl,
          intro: application.intro,
          rules: application.rules,
          allowAnonymous: application.allowAnonymous,
          status: CircleStatus.ACTIVE,
          followersCount: 1
        },
        select: {
          id: true
        }
      });

      createdCircleId = createdCircle.id;

      await tx.circleManagerRelation.create({
        data: {
          circleId: createdCircle.id,
          userId: application.applicantId,
          role: CircleManagerRole.OWNER,
          grantedById: admin.id
        }
      });

      await tx.circleFollow.create({
        data: {
          circleId: createdCircle.id,
          userId: application.applicantId
        }
      });
    }

    const nextStatus =
      input.decision === "APPROVE" ? WorkflowStatus.APPROVED : WorkflowStatus.REJECTED;

    await tx.circleApplication.update({
      where: {
        id: application.id
      },
      data: {
        status: nextStatus,
        reviewerId: admin.id,
        reviewedAt,
        reviewNote: normalizedNote,
        circleId: createdCircleId
      }
    });

    await tx.moderationAction.create({
      data: {
        actorId: admin.id,
        targetUserId: application.applicantId,
        actionType:
          input.decision === "APPROVE"
            ? ModerationActionType.APPROVE_CIRCLE
            : ModerationActionType.REJECT_CIRCLE,
        targetType: ReportTargetType.CIRCLE,
        targetId: createdCircleId ?? application.id,
        reason: normalizedNote,
        metadataJson: {
          applicationId: application.id,
          circleName: application.name,
          circleSlug: application.slug,
          decision: input.decision,
          reviewedAt: reviewedAt.toISOString()
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action:
          input.decision === "APPROVE" ? "approve_circle_application" : "reject_circle_application",
        entityType: "circle_application",
        entityId: application.id,
        payloadJson: {
          category: application.category.name,
          circleName: application.name,
          circleSlug: application.slug,
          applicant: getActorDisplayName(application.applicant),
          decision: input.decision,
          reviewNote: normalizedNote
        }
      }
    });

    return {
      ok: true,
      message:
        input.decision === "APPROVE"
          ? `已通过 ${application.name} 的圈子申请。`
          : `已拒绝 ${application.name} 的圈子申请。`
    } as const;
  });
}

export async function getManageableCircleBySlug(input: {
  slug: string;
  actorId: string;
  actorRole: UserRole;
}) {
  return getCircleAccessContext(input);
}

export async function updateCircleProfile(
  actor: {
    id: string;
    username: string;
    role: UserRole;
    profile?: { nickname: string | null } | null;
  },
  circleId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = circleProfileSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查圈子资料后再保存。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const accessContext = await getCircleAccessContext({
    circleId,
    actorId: actor.id,
    actorRole: actor.role
  });

  if (!accessContext?.canManage) {
    return {
      ok: false,
      message: "你当前没有维护这个圈子的权限。"
    };
  }

  const [category, existingSlugCircle, existingNameCircle] = await Promise.all([
    prisma.circleCategory.findUnique({
      where: {
        id: parsed.data.categoryId
      }
    }),
    prisma.circle.findFirst({
      where: {
        slug: parsed.data.slug,
        NOT: {
          id: circleId
        },
        deletedAt: null
      },
      select: {
        id: true
      }
    }),
    prisma.circle.findFirst({
      where: {
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        NOT: {
          id: circleId
        },
        deletedAt: null
      },
      select: {
        id: true
      }
    })
  ]);

  if (!category) {
    return {
      ok: false,
      message: "未找到对应的圈子分类。"
    };
  }

  if (existingSlugCircle) {
    return {
      ok: false,
      message: "这个圈子 slug 已经被占用。",
      fieldErrors: {
        slug: "圈子 slug 已存在"
      }
    };
  }

  if (existingNameCircle) {
    return {
      ok: false,
      message: "该分类下已经有同名圈子。",
      fieldErrors: {
        name: "该分类下圈子名称已存在"
      }
    };
  }

  const updatedCircle = await prisma.circle.update({
    where: {
      id: circleId
    },
    data: {
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      coverUrl: parsed.data.coverUrl || null,
      iconUrl: parsed.data.iconUrl || null,
      intro: parsed.data.intro,
      rules: parsed.data.rules,
      announcement: parsed.data.announcement || null,
      allowAnonymous: parsed.data.allowAnonymous
    },
    select: {
      slug: true,
      name: true
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "update_circle_profile",
      entityType: "circle",
      entityId: circleId,
      payloadJson: {
        actor: getActorDisplayName(actor),
        circleName: updatedCircle.name,
        circleSlug: updatedCircle.slug
      }
    }
  });

  return {
    ok: true,
    message: "圈子资料已保存。",
    redirectTo: `/circles/${updatedCircle.slug}/manage?result=updated`
  };
}

export async function addCircleManager(
  actor: {
    id: string;
    username: string;
    role: UserRole;
    profile?: { nickname: string | null } | null;
  },
  circleId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = circleManagerSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请输入要添加的用户名。"
    } as const;
  }

  const accessContext = await getCircleAccessContext({
    circleId,
    actorId: actor.id,
    actorRole: actor.role
  });

  if (!accessContext?.canManageManagers) {
    return {
      ok: false,
      message: "只有圈主或超级管理员可以维护圈管名单。"
    } as const;
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      username: parsed.data.username,
      status: UserStatus.ACTIVE
    },
    include: {
      profile: true
    }
  });

  if (!targetUser) {
    return {
      ok: false,
      message: "未找到可添加为圈管的有效用户。"
    } as const;
  }

  if (accessContext.circle.ownerId === targetUser.id) {
    return {
      ok: false,
      message: "圈主已经天然拥有管理权限，无需重复添加。"
    } as const;
  }

  const existingRelation = accessContext.circle.managers.find((item) => item.userId === targetUser.id);

  if (existingRelation) {
    return {
      ok: false,
      message: "该用户已经在圈管名单中。"
    } as const;
  }

  await prisma.circleManagerRelation.create({
    data: {
      circleId,
      userId: targetUser.id,
      role: CircleManagerRole.MANAGER,
      grantedById: actor.id
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "add_circle_manager",
      entityType: "circle",
      entityId: circleId,
      payloadJson: {
        actor: getActorDisplayName(actor),
        manager: getActorDisplayName(targetUser)
      }
    }
  });

  return {
    ok: true,
    message: `已将 ${getActorDisplayName(targetUser)} 添加为圈管。`
  } as const;
}

export async function removeCircleManager(
  actor: {
    id: string;
    username: string;
    role: UserRole;
    profile?: { nickname: string | null } | null;
  },
  circleId: string,
  relationId: string
) {
  const accessContext = await getCircleAccessContext({
    circleId,
    actorId: actor.id,
    actorRole: actor.role
  });

  if (!accessContext?.canManageManagers) {
    return {
      ok: false,
      message: "只有圈主或超级管理员可以维护圈管名单。"
    } as const;
  }

  const relation = accessContext.circle.managers.find((item) => item.id === relationId);

  if (!relation) {
    return {
      ok: false,
      message: "未找到对应的圈管关系。"
    } as const;
  }

  if (relation.role === CircleManagerRole.OWNER) {
    return {
      ok: false,
      message: "圈主关系不能从这里移除。"
    } as const;
  }

  await prisma.circleManagerRelation.delete({
    where: {
      id: relationId
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "remove_circle_manager",
      entityType: "circle",
      entityId: circleId,
      payloadJson: {
        actor: getActorDisplayName(actor),
        manager: getActorDisplayName(relation.user)
      }
    }
  });

  return {
    ok: true,
    message: `已移除 ${getActorDisplayName(relation.user)} 的圈管权限。`
  } as const;
}

export async function deleteCirclePostByManager(
  actor: {
    id: string;
    username: string;
    role: UserRole;
    profile?: { nickname: string | null } | null;
  },
  circleId: string,
  input: {
    postId: string;
    reason?: string | null;
  }
) {
  const normalizedReason = input.reason?.trim() || null;
  const accessContext = await getCircleAccessContext({
    circleId,
    actorId: actor.id,
    actorRole: actor.role
  });

  if (!accessContext?.canManage) {
    return {
      ok: false,
      message: "你当前没有处理这个圈子帖子的权限。"
    } as const;
  }

  const post = await prisma.post.findFirst({
    where: {
      id: input.postId,
      circleId,
      deletedAt: null,
      status: {
        not: ContentStatus.DELETED
      }
    },
    select: {
      id: true,
      title: true,
      status: true,
      authorId: true,
      circle: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  if (!post) {
    return {
      ok: false,
      message: "未找到可处理的帖子，可能已被删除。"
    } as const;
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: {
        id: post.id
      },
      data: {
        status: ContentStatus.DELETED,
        deletedAt: new Date()
      }
    });

    if (post.status === ContentStatus.PUBLISHED) {
      await tx.circle.update({
        where: {
          id: post.circle.id
        },
        data: {
          postsCount: {
            decrement: 1
          }
        }
      });
    }

    await tx.moderationAction.create({
      data: {
        actorId: actor.id,
        targetUserId: post.authorId,
        actionType: ModerationActionType.DELETE_POST,
        targetType: ReportTargetType.POST,
        targetId: post.id,
        reason: normalizedReason,
        metadataJson: {
          scope: "circle",
          circleId: post.circle.id,
          circleName: post.circle.name,
          circleSlug: post.circle.slug
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "delete_post_by_circle_manager",
        entityType: "post",
        entityId: post.id,
        payloadJson: {
          actor: getActorDisplayName(actor),
          title: post.title,
          circleName: post.circle.name,
          circleSlug: post.circle.slug,
          reason: normalizedReason
        }
      }
    });

    if (post.authorId !== actor.id) {
      await createNotification(tx, {
        userId: post.authorId,
        type: NotificationType.SYSTEM,
        payload: {
          title: "你的帖子已被圈内管理员移除",
          body: normalizedReason
            ? `帖子《${post.title}》已被圈内管理员移除，原因：${normalizedReason}`
            : `帖子《${post.title}》已被圈内管理员移除。`,
          href: `/circles/${post.circle.slug}`
        }
      });
    }
  });

  return {
    ok: true,
    message: `已删除帖子《${post.title}》。`
  } as const;
}
