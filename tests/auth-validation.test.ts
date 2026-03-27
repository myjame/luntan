import assert from "node:assert/strict";
import test from "node:test";

import {
  loginSchema,
  registerSchema
} from "../src/modules/auth/lib/validation";

test("注册参数：合法输入可通过", () => {
  const parsed = registerSchema.safeParse({
    username: "demo_user",
    email: "DEMO@EXAMPLE.COM",
    password: "Pass1234",
    confirmPassword: "Pass1234",
    nickname: "测试用户",
    avatarUrl: "",
    bio: "",
    directMessagePermission: "FOLLOWING_ONLY",
    captchaAnswer: "42",
    captchaToken: "token-ok",
    website: ""
  });

  assert.equal(parsed.success, true);

  if (!parsed.success) {
    return;
  }

  assert.equal(parsed.data.email, "demo@example.com");
});

test("注册参数：密码不一致会被拦截", () => {
  const parsed = registerSchema.safeParse({
    username: "demo_user",
    email: "demo@example.com",
    password: "Pass1234",
    confirmPassword: "Pass5678",
    nickname: "测试用户",
    avatarUrl: "",
    bio: "",
    directMessagePermission: "FOLLOWING_ONLY",
    captchaAnswer: "42",
    captchaToken: "token-ok",
    website: ""
  });

  assert.equal(parsed.success, false);
});

test("登录参数：缺少账号标识会被拦截", () => {
  const parsed = loginSchema.safeParse({
    identifier: "",
    password: "Pass1234"
  });

  assert.equal(parsed.success, false);
});
