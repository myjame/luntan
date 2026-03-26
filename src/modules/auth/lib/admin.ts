import "server-only";

import {
  ModerationActionType,
  ReportStatus,
  ReportTargetType,
  UserRole,
  UserStatus,
  type Prisma
} from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

import type { AuthUserRole, AuthUserStatus } from "@/modules/auth/lib/types";

const adminUserSelect = {
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
    select: {
      username: true,
      profile: {
        select: {
          nickname: true
        }
      }
    }
  }
} satisfies Prisma.UserSelect;

export type AdminUserListItem = Prisma.UserGetPayload<{
  select: typeof adminUserSelect;
}>;

export type AdminReviewDecision = "APPROVE" | "REJECT";

export type AdminUserQueryResult = {
  items: AdminUserListItem[];
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
    select: adminUserSelect,
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
    include: {
      profile: true,
      settings: true,
      reviewedBy: {
        include: {
          profile: true
        }
      }
    }
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

    return {
      ok: true,
      message:
        input.decision === "APPROVE"
          ? `已通过 ${user.username} 的注册申请。`
          : `已拒绝 ${user.username} 的注册申请。`
    } as const;
  });
}
