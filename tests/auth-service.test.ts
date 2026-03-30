import assert from "node:assert/strict";
import test from "node:test";

import { UserStatus } from "../src/generated/prisma/client";
import { createCaptchaChallenge } from "../src/modules/auth/lib/captcha";
import { hashPassword } from "../src/modules/auth/lib/password";
import { loginUser, registerUser } from "../src/modules/auth/lib/service";
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

test("注册链路：合法输入会创建待审核账号", async () => {
  resetRateLimitStore();

  let createdUserInput: Record<string, unknown> | null = null;
  const restoreFindFirst = patchMethod(prisma.user, "findFirst", async () => null);
  const restoreCreate = patchMethod(
    prisma.user,
    "create",
    async (input: Record<string, unknown>) => {
      createdUserInput = input;

      return {
        id: "user-1"
      };
    }
  );

  const successCaptcha = await createCaptchaChallenge();
  const match = successCaptcha.question.match(/^(\d+) \+ (\d+) = \?$/);

  assert.ok(match, "captcha question should be parsable");

  const successResult = await registerUser({
    username: "demo_user",
    email: "demo@example.com",
    password: "Pass1234",
    confirmPassword: "Pass1234",
    nickname: "测试用户",
    avatarUrl: "",
    bio: "",
    directMessagePermission: "FOLLOWING_ONLY",
    captchaAnswer: String(Number(match[1]) + Number(match[2])),
    captchaToken: successCaptcha.token,
    website: ""
  });

  assert.equal(successResult.ok, true);
  assert.ok(createdUserInput);

  const createData = createdUserInput as {
    data: {
      status: UserStatus;
      role: string;
      profile: {
        create: {
          nickname: string;
        };
      };
    };
  };

  assert.equal(createData.data.status, UserStatus.PENDING_REVIEW);
  assert.equal(createData.data.role, "USER");
  assert.equal(createData.data.profile.create.nickname, "测试用户");

  restoreCreate();
  restoreFindFirst();
});

test("登录链路：待审核账号会被拦截并返回状态提示", async () => {
  resetRateLimitStore();

  const passwordHash = await hashPassword("Pass1234");
  let updateCalled = false;

  const restoreFindFirst = patchMethod(
    prisma.user,
    "findFirst",
    async () => ({
      id: "user-1",
      username: "demo_user",
      email: "demo@example.com",
      passwordHash,
      status: UserStatus.PENDING_REVIEW,
      role: "USER",
      profile: {
        nickname: "测试用户"
      }
    })
  );
  const restoreUpdate = patchMethod(
    prisma.user,
    "update",
    async () => {
      updateCalled = true;

      return {
        id: "user-1"
      };
    }
  );

  const result = await loginUser({
    identifier: "demo_user",
    password: "Pass1234"
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, UserStatus.PENDING_REVIEW);
  assert.match(result.message, /审核中/);
  assert.equal(updateCalled, false);

  restoreUpdate();
  restoreFindFirst();
});
