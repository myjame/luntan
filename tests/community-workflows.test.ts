import assert from "node:assert/strict";
import test from "node:test";

import {
  NotificationType,
  ReportStatus,
  ReportTargetType,
  UserStatus,
  WorkflowStatus
} from "../src/generated/prisma/client";
import { reviewUserRegistration } from "../src/modules/auth/lib/admin";
import {
  resolveCircleReport,
  reviewCircleApplication
} from "../src/modules/community/lib/service";
import { prisma } from "../src/server/db/prisma";

function patchMethod<T extends object, K extends keyof T>(object: T, key: K, replacement: unknown) {
  const original = object[key];

  (object as Record<PropertyKey, unknown>)[key as PropertyKey] = replacement as unknown;

  return () => {
    (object as Record<PropertyKey, unknown>)[key as PropertyKey] = original as unknown;
  };
}

test("审核流程：通过注册审核会激活账号并写入通知", async () => {
  const notifications: Array<Record<string, unknown>> = [];
  let updatedStatus: UserStatus | null = null;

  const tx = {
    user: {
      findUnique: async () => ({
        id: "user-1",
        username: "demo_user",
        email: "demo@example.com",
        status: UserStatus.PENDING_REVIEW
      }),
      update: async (input: { data: { status: UserStatus } }) => {
        updatedStatus = input.data.status;
        return {
          id: "user-1"
        };
      }
    },
    moderationAction: {
      create: async () => ({ id: "ma-1" })
    },
    auditLog: {
      create: async () => ({ id: "log-1" })
    },
    notification: {
      create: async (input: Record<string, unknown>) => {
        notifications.push(input);
        return {
          id: "notice-1"
        };
      }
    }
  };

  const restoreTransaction = patchMethod(
    prisma,
    "$transaction",
    async (callback: (client: typeof tx) => unknown) => callback(tx)
  );

  const result = await reviewUserRegistration("admin-1", {
    userId: "user-1",
    decision: "APPROVE"
  });

  assert.equal(result.ok, true);
  assert.equal(updatedStatus, UserStatus.ACTIVE);
  assert.equal(notifications.length, 1);
  assert.equal(
    (notifications[0].data as { type: NotificationType }).type,
    NotificationType.REGISTRATION_REVIEW
  );

  restoreTransaction();
});

test("圈子申请：通过审核后会创建圈子并建立圈主关系", async () => {
  let createdCircleOwnerId: string | null = null;
  let createdFollowCircleId: string | null = null;
  let updatedApplicationStatus: WorkflowStatus | null = null;

  const tx = {
    circleApplication: {
      findUnique: async () => ({
        id: "app-1",
        applicantId: "user-1",
        categoryId: "cat-1",
        name: "夜航游戏厅",
        slug: "yehang-game",
        coverUrl: null,
        iconUrl: null,
        intro: "这是一个长期讨论独立游戏和老游戏体验的圈子。",
        rules: "理性讨论，不刷屏。",
        allowAnonymous: false,
        status: WorkflowStatus.PENDING,
        category: {
          name: "游戏"
        },
        applicant: {
          username: "demo_user",
          profile: {
            nickname: "测试用户"
          }
        }
      }),
      update: async (input: { data: { status: WorkflowStatus } }) => {
        updatedApplicationStatus = input.data.status;
        return {
          id: "app-1"
        };
      }
    },
    circle: {
      findUnique: async () => null,
      create: async (input: {
        data: {
          ownerId: string;
        };
      }) => {
        createdCircleOwnerId = input.data.ownerId;

        return {
          id: "circle-1"
        };
      }
    },
    circleManagerRelation: {
      create: async () => ({ id: "relation-1" })
    },
    circleFollow: {
      create: async (input: { data: { circleId: string } }) => {
        createdFollowCircleId = input.data.circleId;

        return {
          id: "follow-1"
        };
      }
    },
    moderationAction: {
      create: async () => ({ id: "ma-1" })
    },
    auditLog: {
      create: async () => ({ id: "log-1" })
    }
  };

  const restoreTransaction = patchMethod(
    prisma,
    "$transaction",
    async (callback: (client: typeof tx) => unknown) => callback(tx)
  );

  const result = await reviewCircleApplication(
    {
      id: "admin-1",
      username: "admin"
    },
    {
      applicationId: "app-1",
      decision: "APPROVE"
    }
  );

  assert.equal(result.ok, true);
  assert.equal(createdCircleOwnerId, "user-1");
  assert.equal(createdFollowCircleId, "circle-1");
  assert.equal(updatedApplicationStatus, WorkflowStatus.APPROVED);

  restoreTransaction();
});

test("举报治理：圈主管理页可将圈内帖子举报处理为禁言并结案", async () => {
  let reportStatus: ReportStatus | null = null;
  let mutedUserId: string | null = null;
  const notifications: Array<Record<string, unknown>> = [];

  const restoreCircleFindFirst = patchMethod(
    prisma.circle,
    "findFirst",
    async () => ({
      id: "circle-1",
      name: "夜航游戏厅",
      slug: "yehang-game",
      ownerId: "owner-1",
      category: {
        id: "cat-1",
        name: "游戏"
      },
      owner: {
        id: "owner-1",
        username: "owner",
        profile: {
          nickname: "圈主"
        }
      },
      managers: [
        {
          id: "owner-relation",
          userId: "owner-1",
          role: "OWNER",
          user: {
            username: "owner",
            profile: {
              nickname: "圈主"
            }
          }
        }
      ]
    })
  );

  const tx = {
    report: {
      findUnique: async () => ({
        id: "report-1",
        targetType: ReportTargetType.POST,
        targetId: "post-1",
        status: ReportStatus.PENDING
      }),
      update: async (input: { data: { status: ReportStatus } }) => {
        reportStatus = input.data.status;
        return {
          id: "report-1"
        };
      }
    },
    post: {
      findUnique: async () => ({
        id: "post-1",
        title: "违规帖子",
        authorId: "user-2",
        deletedAt: null,
        circle: {
          id: "circle-1",
          name: "夜航游戏厅",
          slug: "yehang-game"
        }
      })
    },
    user: {
      findUnique: async () => ({
        id: "user-2",
        username: "target_user",
        role: "USER",
        profile: {
          nickname: "违规用户"
        }
      })
    },
    circleMute: {
      upsert: async (input: {
        where: {
          circleId_userId: {
            userId: string;
          };
        };
      }) => {
        mutedUserId = input.where.circleId_userId.userId;

        return {
          id: "mute-1",
          expiresAt: new Date("2026-04-02T08:00:00.000Z")
        };
      }
    },
    moderationAction: {
      create: async () => ({ id: "ma-1" })
    },
    auditLog: {
      create: async () => ({ id: "log-1" })
    },
    notification: {
      create: async (input: Record<string, unknown>) => {
        notifications.push(input);
        return {
          id: "notice-1"
        };
      }
    }
  };

  const restoreTransaction = patchMethod(
    prisma,
    "$transaction",
    async (callback: (client: typeof tx) => unknown) => callback(tx)
  );

  const result = await resolveCircleReport(
    {
      id: "owner-1",
      username: "owner",
      role: "USER"
    },
    "circle-1",
    {
      reportId: "report-1",
      action: "MUTE_3_DAYS",
      resolutionNote: "连续辱骂他人"
    }
  );

  assert.equal(result.ok, true);
  assert.equal(reportStatus, ReportStatus.RESOLVED);
  assert.equal(mutedUserId, "user-2");
  assert.equal(notifications.length, 1);

  restoreTransaction();
  restoreCircleFindFirst();
});
