import assert from "node:assert/strict";
import test from "node:test";

import {
  circleApplicationSchema,
  circleReviewSchema
} from "../src/modules/community/lib/validation";
import {
  reportResolutionSchema,
  reportSubmissionSchema,
  userRestrictionSchema
} from "../src/modules/moderation/lib/validation";

test("圈子申请：基础参数可通过校验", () => {
  const parsed = circleApplicationSchema.safeParse({
    categoryId: "cat-1",
    name: "夜航游戏厅",
    slug: "yehang-game",
    coverUrl: "https://example.com/cover.jpg",
    iconUrl: "https://example.com/icon.jpg",
    intro: "这是一个长期讨论独立游戏和老游戏体验的圈子。",
    rules: "理性讨论，不人身攻击，不刷屏。",
    allowAnonymous: "false"
  });

  assert.equal(parsed.success, true);
});

test("圈子审核：缺少申请标识会被拦截", () => {
  const parsed = circleReviewSchema.safeParse({
    applicationId: "",
    decision: "APPROVE",
    reviewNote: "通过"
  });

  assert.equal(parsed.success, false);
});

test("举报提交：基础参数可通过校验", () => {
  const parsed = reportSubmissionSchema.safeParse({
    targetType: "POST",
    targetId: "post-1",
    reportType: "SPAM",
    detail: "重复广告内容"
  });

  assert.equal(parsed.success, true);
});

test("举报治理：缺少举报标识会被拦截", () => {
  const parsed = reportResolutionSchema.safeParse({
    reportId: "",
    action: "DELETE_POST",
    resolutionNote: "违规广告，删除内容。"
  });

  assert.equal(parsed.success, false);
});

test("用户治理：限制动作参数可通过校验", () => {
  const parsed = userRestrictionSchema.safeParse({
    userId: "user-1",
    action: "MUTE_7_DAYS",
    reason: "连续发布攻击性内容"
  });

  assert.equal(parsed.success, true);
});
