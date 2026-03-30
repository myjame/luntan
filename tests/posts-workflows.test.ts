import assert from "node:assert/strict";
import test from "node:test";

import {
  CircleStatus,
  ContentStatus
} from "../src/generated/prisma/client";
import {
  createComment,
  createPost
} from "../src/modules/posts/lib/service";
import { prisma } from "../src/server/db/prisma";

function resetRateLimitStore() {
  globalThis.__luntanRateLimitStore__ = new Map();
}

function patchMethod<T extends object, K extends keyof T>(object: T, key: K, replacement: unknown) {
  const original = object[key];

  (object as Record<PropertyKey, unknown>)[key as PropertyKey] = replacement as unknown;

  return () => {
    (object as Record<PropertyKey, unknown>)[key as PropertyKey] = original as unknown;
  };
}

function getCircleMuteDelegate() {
  return (prisma as unknown as {
    circleMute: {
      findFirst: (input: unknown) => Promise<unknown>;
    };
  }).circleMute;
}

test("发帖链路：圈内禁言中的用户会被拦截", async () => {
  resetRateLimitStore();

  const restoreCircleFindUnique = patchMethod(
    prisma.circle,
    "findUnique",
    async () => ({
      id: "circle-1",
      name: "夜航游戏厅",
      slug: "yehang-game",
      status: CircleStatus.ACTIVE,
      deletedAt: null,
      allowAnonymous: false,
      ownerId: "owner-1",
      category: {
        name: "游戏"
      },
      managers: []
    })
  );
  const restoreCircleMuteFindFirst = patchMethod(
    getCircleMuteDelegate(),
    "findFirst",
    async () => ({
      id: "mute-1",
      reason: "刷屏引流",
      expiresAt: new Date("2026-04-02T08:00:00.000Z"),
      circle: {
        id: "circle-1",
        name: "夜航游戏厅",
        slug: "yehang-game"
      }
    })
  );

  const result = await createPost(
    {
      id: "user-1",
      username: "demo_user",
      role: "USER",
      settings: {
        allowAnonymousPosts: true
      },
      profile: {
        nickname: "测试用户"
      }
    },
    {
      fields: {
        circleId: "circle-1",
        postType: "DISCUSSION",
        title: "第一次发帖",
        content: "这是一个满足最小长度要求的正常发帖内容，用来验证圈内禁言拦截。",
        mediaUrls: "",
        globalTags: "",
        circleTags: "",
        isAnonymous: "false",
        pollQuestion: "",
        pollOptions: "",
        allowMultiple: "false",
        resultVisibility: "ALWAYS_PUBLIC",
        expiresAt: ""
      },
      attachments: []
    }
  );

  assert.equal(result.ok, false);
  assert.match(result.message, /禁言/);

  restoreCircleMuteFindFirst();
  restoreCircleFindUnique();
});

test("评论链路：圈内禁言中的用户会被拦截", async () => {
  resetRateLimitStore();

  const restorePostFindUnique = patchMethod(
    prisma.post,
    "findUnique",
    async () => ({
      id: "post-1",
      title: "已发布帖子",
      authorId: "author-1",
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      circle: {
        id: "circle-1",
        slug: "yehang-game",
        name: "夜航游戏厅",
        status: CircleStatus.ACTIVE,
        deletedAt: null,
        allowAnonymous: true
      }
    })
  );
  const restoreCircleMuteFindFirst = patchMethod(
    getCircleMuteDelegate(),
    "findFirst",
    async () => ({
      id: "mute-1",
      reason: "攻击性发言",
      expiresAt: new Date("2026-04-02T08:00:00.000Z"),
      circle: {
        id: "circle-1",
        name: "夜航游戏厅",
        slug: "yehang-game"
      }
    })
  );

  const result = await createComment(
    {
      id: "user-1",
      username: "demo_user",
      role: "USER",
      settings: {
        allowAnonymousComments: true
      }
    },
    {
      postId: "post-1",
      parentId: "",
      rootId: "",
      content: "这是一个会被圈内禁言规则拦住的评论内容。",
      mediaUrls: "",
      isAnonymous: "false"
    }
  );

  assert.equal(result.ok, false);
  assert.match(result.message, /禁言/);

  restoreCircleMuteFindFirst();
  restorePostFindUnique();
});
