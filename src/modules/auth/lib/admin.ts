import "server-only";

import {
  ModerationActionType,
  NotificationType,
  ReportStatus,
  ReportTargetType,
  UserRole,
  UserStatus,
  WorkflowStatus,
  type Prisma
} from "@/generated/prisma/client";
import { createNotification } from "@/modules/notifications/lib/service";
import { prisma } from "@/server/db/prisma";

import type { AuthUserRole, AuthUserStatus } from "@/modules/auth/lib/types";

const adminReviewerSelect = {
  username: true,
  profile: {
    select: {
      nickname: true
    }
  }
} satisfies Prisma.UserSelect;

const adminUserListSelect = {
  id: true,
  username: true,
  email: true,
  status: true,
  role: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
  lastLoginAt: true,
  deletionRequestedAt: true,
  profile: {
    select: {
      nickname: true,
      avatarUrl: true,
      bio: true
    }
  },
  reviewedBy: {
    select: adminReviewerSelect
  }
} satisfies Prisma.UserSelect;

const adminUserDetailSelect = {
  ...adminUserListSelect,
  profile: {
    select: {
      nickname: true,
      avatarUrl: true,
      bio: true,
      featuredBadgeId: true,
      titleBadgeId: true,
      featuredBadge: {
        select: {
          id: true,
          name: true
        }
      },
      titleBadge: {
        select: {
          id: true,
          name: true
        }
      }
    }
  },
  settings: {
    select: {
      directMessagePermission: true,
      homepageLastFeedChannel: true
    }
  },
  userBadges: {
    orderBy: [{ grantedAt: "desc" }],
    select: {
      id: true,
      reason: true,
      expiresAt: true,
      grantedAt: true,
      badge: {
        select: {
          id: true,
          name: true,
          kind: true,
          description: true
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
    }
  },
  deletionRequests: {
    where: {
      status: WorkflowStatus.PENDING
    },
    orderBy: [{ createdAt: "desc" }],
    take: 1,
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true
    }
  }
} satisfies Prisma.UserSelect;

export type AdminUserListItem = Prisma.UserGetPayload<{
  select: typeof adminUserListSelect;
}>;

export type AdminUserDetail = Prisma.UserGetPayload<{
  select: typeof adminUserDetailSelect;
}>;

export type AdminReviewDecision = "APPROVE" | "REJECT";
export type AdminAccountDeletionDecision = "APPROVE" | "REJECT";

export type AdminUserQueryResult = {
  items: AdminUserListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const adminDeletionRequestSelect = {
  id: true,
  reason: true,
  status: true,
  reviewNote: true,
  createdAt: true,
  reviewedAt: true,
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      status: true,
      deletionRequestedAt: true,
      profile: {
        select: {
          nickname: true,
          avatarUrl: true
        }
      }
    }
  }
} satisfies Prisma.AccountDeletionRequestSelect;

export type AdminPendingDeletionItem = Prisma.AccountDeletionRequestGetPayload<{
  select: typeof adminDeletionRequestSelect;
}>;

export type AdminPendingDeletionQueryResult = {
  items: AdminPendingDeletionItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const adminUserStatusOptions: Array<{ value: AuthUserStatus; label: string }> = [
  { value: "PENDING_REVIEW", label: "待审核" },
  { value: "ACTIVE", label: "已激活" },
  { value: "REJECTED", label: "已拒绝" },
  { value: "MUTED", label: "禁言中" },
  { value: "BANNED", label: "已封禁" },
  { value: "DISABLED", label: "已停用" },
  { value: "PENDING_DELETION", label: "待注销" }
];

export const adminUserRoleOptions: Array<{ value: AuthUserRole; label: string }> = [
  { value: "USER", label: "普通用户" },
  { value: "SUPER_ADMIN", label: "超级管理员" }
];

const adminUserStatusMeta: Record<
  AuthUserStatus,
  {
    label: string;
    className: string;
  }
> = {
  PENDING_REVIEW: {
    label: "待审核",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-800"
  },
  ACTIVE: {
    label: "已激活",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
  },
  REJECTED: {
    label: "已拒绝",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-800"
  },
  MUTED: {
    label: "禁言中",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-700"
  },
  BANNED: {
    label: "已封禁",
    className: "border-red-600/20 bg-red-600/10 text-red-700"
  },
  DISABLED: {
    label: "已停用",
    className: "border-stone-500/20 bg-stone-500/10 text-stone-700"
  },
  PENDING_DELETION: {
    label: "待注销",
    className: "border-orange-700/20 bg-orange-700/10 text-orange-800"
  }
};

const adminUserRoleMeta: Record<
  AuthUserRole,
  {
    label: string;
    className: string;
  }
> = {
  USER: {
    label: "普通用户",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-700"
  },
  SUPER_ADMIN: {
    label: "超级管理员",
    className: "border-[rgba(181,138,56,0.28)] bg-[rgba(181,138,56,0.12)] text-[var(--color-gold)]"
  }
};

function buildUserSearchConditions(query: string): Prisma.UserWhereInput[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  return [
    {
      username: {
        contains: trimmed,
        mode: "insensitive"
      }
    },
    {
      email: {
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
  ];
}

function buildDeletionRequestSearchConditions(query: string): Prisma.AccountDeletionRequestWhereInput[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  return [
    {
      user: {
        is: {
          username: {
            contains: trimmed,
            mode: "insensitive"
          }
        }
      }
    },
    {
      user: {
        is: {
          email: {
            contains: trimmed,
            mode: "insensitive"
          }
        }
      }
    },
    {
      user: {
        is: {
          profile: {
            is: {
              nickname: {
                contains: trimmed,
                mode: "insensitive"
              }
            }
          }
        }
      }
    }
  ];
}

function parseDateInput(value: string | undefined, boundary: "start" | "end") {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(
    `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`
  );

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function buildCreatedAtFilter(createdFrom?: string, createdTo?: string) {
  const gte = parseDateInput(createdFrom, "start");
  const lte = parseDateInput(createdTo, "end");

  if (!gte && !lte) {
    return undefined;
  }

  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {})
  } satisfies Prisma.DateTimeFilter;
}

function normalizePageNumber(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

async function paginateUsers(args: {
  where: Prisma.UserWhereInput;
  orderBy: Prisma.UserOrderByWithRelationInput[];
  page?: number;
  pageSize: number;
}): Promise<AdminUserQueryResult> {
  const totalCount = await prisma.user.count({
    where: args.where
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / args.pageSize));
  const page = Math.min(normalizePageNumber(args.page), totalPages);
  const items = await prisma.user.findMany({
    where: args.where,
    select: adminUserListSelect,
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

async function paginateDeletionRequests(args: {
  where: Prisma.AccountDeletionRequestWhereInput;
  orderBy: Prisma.AccountDeletionRequestOrderByWithRelationInput[];
  page?: number;
  pageSize: number;
}): Promise<AdminPendingDeletionQueryResult> {
  const totalCount = await prisma.accountDeletionRequest.count({
    where: args.where
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / args.pageSize));
  const page = Math.min(normalizePageNumber(args.page), totalPages);
  const items = await prisma.accountDeletionRequest.findMany({
    where: args.where,
    select: adminDeletionRequestSelect,
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

export function getAdminUserStatusMeta(status: AuthUserStatus) {
  return adminUserStatusMeta[status];
}

export function getAdminUserRoleMeta(role: AuthUserRole) {
  return adminUserRoleMeta[role];
}

export function getReviewedByLabel(user: AdminUserListItem) {
  return user.reviewedBy?.profile?.nickname ?? user.reviewedBy?.username ?? null;
}

export async function getAdminDashboardStats() {
  const [pendingUserCount, pendingPostCount, pendingCommentCount, pendingReportCount, activeUserCount] =
    await Promise.all([
      prisma.user.count({
        where: {
          status: UserStatus.PENDING_REVIEW
        }
      }),
      prisma.post.count({
        where: {
          status: "PENDING_REVIEW"
        }
      }),
      prisma.comment.count({
        where: {
          status: "PENDING_REVIEW"
        }
      }),
      prisma.report.count({
        where: {
          status: ReportStatus.PENDING
        }
      }),
      prisma.user.count({
        where: {
          status: UserStatus.ACTIVE
        }
      })
    ]);

  return {
    pendingUserCount,
    pendingContentCount: pendingPostCount + pendingCommentCount,
    pendingReportCount,
    activeUserCount
  };
}

export async function getAdminUserDirectorySummary() {
  const [totalUserCount, pendingReviewCount, activeUserCount, rejectedUserCount, pendingDeletionCount, restrictedUserCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          status: UserStatus.PENDING_REVIEW
        }
      }),
      prisma.user.count({
        where: {
          status: UserStatus.ACTIVE
        }
      }),
      prisma.user.count({
        where: {
          status: UserStatus.REJECTED
        }
      }),
      prisma.user.count({
        where: {
          status: UserStatus.PENDING_DELETION
        }
      }),
      prisma.user.count({
        where: {
          status: {
            in: [UserStatus.MUTED, UserStatus.BANNED, UserStatus.DISABLED]
          }
        }
      })
    ]);

  return {
    totalUserCount,
    pendingReviewCount,
    activeUserCount,
    rejectedUserCount,
    pendingDeletionCount,
    restrictedUserCount
  };
}

export async function listPendingRegistrationUsers(filters?: {
  query?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  take?: number;
}) {
  const searchConditions = buildUserSearchConditions(filters?.query ?? "");
  const createdAt = buildCreatedAtFilter(filters?.createdFrom, filters?.createdTo);

  return paginateUsers({
    where: {
      status: UserStatus.PENDING_REVIEW,
      ...(createdAt
        ? {
            createdAt
          }
        : {}),
      ...(searchConditions.length > 0
        ? {
            OR: searchConditions
          }
        : {})
    },
    orderBy: [{ createdAt: "asc" }, { username: "asc" }],
    page: filters?.page,
    pageSize: Math.min(filters?.take ?? 12, 50)
  });
}

export async function listPendingAccountDeletionRequests(filters?: {
  query?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  take?: number;
}) {
  const searchConditions = buildDeletionRequestSearchConditions(filters?.query ?? "");
  const createdAt = buildCreatedAtFilter(filters?.createdFrom, filters?.createdTo);

  return paginateDeletionRequests({
    where: {
      status: WorkflowStatus.PENDING,
      user: {
        is: {
          status: UserStatus.PENDING_DELETION
        }
      },
      ...(createdAt
        ? {
            createdAt
          }
        : {}),
      ...(searchConditions.length > 0
        ? {
            OR: searchConditions
          }
        : {})
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    page: filters?.page,
    pageSize: Math.min(filters?.take ?? 12, 50)
  });
}

export async function listUsersForAdmin(filters?: {
  query?: string;
  createdFrom?: string;
  createdTo?: string;
  status?: UserStatus;
  role?: UserRole;
  page?: number;
  take?: number;
}) {
  const searchConditions = buildUserSearchConditions(filters?.query ?? "");
  const createdAt = buildCreatedAtFilter(filters?.createdFrom, filters?.createdTo);

  return paginateUsers({
    where: {
      ...(filters?.status
        ? {
            status: filters.status
          }
        : {}),
      ...(filters?.role
        ? {
            role: filters.role
          }
        : {}),
      ...(createdAt
        ? {
            createdAt
          }
        : {}),
      ...(searchConditions.length > 0
        ? {
            OR: searchConditions
          }
        : {})
    },
    orderBy: [{ createdAt: "desc" }, { username: "asc" }],
    page: filters?.page,
    pageSize: Math.min(filters?.take ?? 40, 100)
  });
}

export async function getAdminUserDetail(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId
    },
    select: adminUserDetailSelect
  });
}

export async function reviewUserRegistration(
  adminId: string,
  input: {
    userId: string;
    decision: AdminReviewDecision;
    reviewNote?: string | null;
  }
) {
  const normalizedNote = input.reviewNote?.trim() || null;

  if (input.decision === "REJECT" && !normalizedNote) {
    return {
      ok: false,
      message: "拒绝账号时请填写审核说明。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        id: input.userId
      },
      select: {
        id: true,
        username: true,
        email: true,
        status: true
      }
    });

    if (!user) {
      return {
        ok: false,
        message: "未找到对应的待审核账号。"
      } as const;
    }

    if (user.status !== UserStatus.PENDING_REVIEW) {
      return {
        ok: false,
        message: "该账号已经被处理，请刷新列表后重试。"
      } as const;
    }

    const reviewedAt = new Date();
    const nextStatus = input.decision === "APPROVE" ? UserStatus.ACTIVE : UserStatus.REJECTED;
    const actionType =
      input.decision === "APPROVE"
        ? ModerationActionType.APPROVE_REGISTRATION
        : ModerationActionType.REJECT_REGISTRATION;
    const action =
      input.decision === "APPROVE" ? "approve_user_registration" : "reject_user_registration";

    await tx.user.update({
      where: {
        id: user.id
      },
      data: {
        status: nextStatus,
        reviewNote: normalizedNote,
        reviewedAt,
        reviewedById: adminId
      }
    });

    await tx.moderationAction.create({
      data: {
        actorId: adminId,
        targetUserId: user.id,
        actionType,
        targetType: ReportTargetType.USER,
        targetId: user.id,
        reason: normalizedNote,
        metadataJson: {
          fromStatus: user.status,
          toStatus: nextStatus,
          reviewedAt: reviewedAt.toISOString(),
          reviewNote: normalizedNote
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action,
        entityType: "user",
        entityId: user.id,
        payloadJson: {
          username: user.username,
          email: user.email,
          fromStatus: user.status,
          toStatus: nextStatus,
          reviewedAt: reviewedAt.toISOString(),
          reviewNote: normalizedNote
        }
      }
    });

    await createNotification(tx, {
      userId: user.id,
      type: NotificationType.REGISTRATION_REVIEW,
      payload: {
        title:
          input.decision === "APPROVE"
            ? "你的注册申请已通过"
            : "你的注册申请未通过",
        body:
          input.decision === "APPROVE"
            ? "账号已经转为激活状态，现在可以正常登录和互动。"
            : normalizedNote
              ? `审核未通过：${normalizedNote}`
              : "审核未通过，可以根据提示调整后重新尝试。",
        href: `/account-status?status=${nextStatus}`
      }
    });

    return {
      ok: true,
      message:
        input.decision === "APPROVE"
          ? `已通过 ${user.username} 的注册申请。`
          : `已拒绝 ${user.username} 的注册申请。`
    } as const;
  });
}

export async function reviewAccountDeletionRequest(
  adminId: string,
  input: {
    requestId: string;
    decision: AdminAccountDeletionDecision;
    reviewNote?: string | null;
  }
) {
  const normalizedNote = input.reviewNote?.trim() || null;

  if (input.decision === "REJECT" && !normalizedNote) {
    return {
      ok: false,
      message: "拒绝注销申请时请填写审核说明。"
    } as const;
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.accountDeletionRequest.findUnique({
      where: {
        id: input.requestId
      },
      select: {
        id: true,
        userId: true,
        status: true,
        reason: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            status: true
          }
        }
      }
    });

    if (!request || !request.user) {
      return {
        ok: false,
        message: "未找到对应的注销申请。"
      } as const;
    }

    if (request.status !== WorkflowStatus.PENDING) {
      return {
        ok: false,
        message: "该注销申请已被处理，请刷新后重试。"
      } as const;
    }

    if (request.user.status !== UserStatus.PENDING_DELETION) {
      return {
        ok: false,
        message: "账号状态已变化，当前申请无法继续处理。"
      } as const;
    }

    if (request.user.role === UserRole.SUPER_ADMIN) {
      return {
        ok: false,
        message: "暂不支持直接注销超级管理员账号。"
      } as const;
    }

    const reviewedAt = new Date();

    if (input.decision === "APPROVE") {
      const anonymizedUsername = `deleted_${request.user.id}`;
      const anonymizedEmail = `deleted+${request.user.id}@deleted.local`;
      const defaultReviewNote = "注销审核通过，账号已执行脱敏保留。";

      await tx.user.update({
        where: {
          id: request.user.id
        },
        data: {
          username: anonymizedUsername,
          email: anonymizedEmail,
          status: UserStatus.DISABLED,
          reviewNote: normalizedNote ?? defaultReviewNote,
          reviewedAt,
          reviewedById: adminId,
          deletionRequestedAt: null,
          disabledAt: reviewedAt,
          mutedUntil: null,
          bannedAt: null
        }
      });

      await tx.userProfile.upsert({
        where: {
          userId: request.user.id
        },
        update: {
          nickname: "已注销用户",
          avatarUrl: null,
          bio: "该账号已完成注销，历史内容按平台规则保留并脱敏展示。",
          featuredBadgeId: null,
          titleBadgeId: null
        },
        create: {
          userId: request.user.id,
          nickname: "已注销用户",
          avatarUrl: null,
          bio: "该账号已完成注销，历史内容按平台规则保留并脱敏展示。",
          featuredBadgeId: null,
          titleBadgeId: null
        }
      });

      await tx.accountDeletionRequest.update({
        where: {
          id: request.id
        },
        data: {
          status: WorkflowStatus.APPROVED,
          reviewNote: normalizedNote,
          reviewedAt,
          reviewedById: adminId,
          anonymizedAt: reviewedAt
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "approve_account_deletion",
          entityType: "user",
          entityId: request.user.id,
          payloadJson: {
            requestId: request.id,
            originalUsername: request.user.username,
            anonymizedUsername,
            originalEmail: request.user.email,
            anonymizedEmail,
            reviewNote: normalizedNote
          }
        }
      });

      await createNotification(tx, {
        userId: request.user.id,
        type: NotificationType.SYSTEM,
        payload: {
          title: "你的注销申请已通过",
          body: "账号已完成注销与脱敏处理，历史内容将按平台规则继续保留展示。",
          href: "/account-status?status=DISABLED"
        }
      });

      return {
        ok: true,
        message: `已通过 ${request.user.username} 的注销申请并执行脱敏。`
      } as const;
    }

    await tx.user.update({
      where: {
        id: request.user.id
      },
      data: {
        status: UserStatus.ACTIVE,
        reviewNote: normalizedNote,
        reviewedAt,
        reviewedById: adminId,
        deletionRequestedAt: null
      }
    });

    await tx.accountDeletionRequest.update({
      where: {
        id: request.id
      },
      data: {
        status: WorkflowStatus.REJECTED,
        reviewNote: normalizedNote,
        reviewedAt,
        reviewedById: adminId
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "reject_account_deletion",
        entityType: "user",
        entityId: request.user.id,
        payloadJson: {
          requestId: request.id,
          username: request.user.username,
          reason: request.reason,
          reviewNote: normalizedNote
        }
      }
    });

    await createNotification(tx, {
      userId: request.user.id,
      type: NotificationType.SYSTEM,
      payload: {
        title: "你的注销申请未通过",
        body: normalizedNote
          ? `注销申请未通过：${normalizedNote}`
          : "注销申请暂未通过，你可以根据提示补充信息后再次提交。",
        href: "/account-status?status=ACTIVE"
      }
    });

    return {
      ok: true,
      message: `已拒绝 ${request.user.username} 的注销申请。`
    } as const;
  });
}
