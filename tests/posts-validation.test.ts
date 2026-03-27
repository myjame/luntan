import assert from "node:assert/strict";
import test from "node:test";

import {
  commentEditorSchema,
  postEditorSchema
} from "../src/modules/posts/lib/validation";

test("发帖参数：普通帖子可通过校验", () => {
  const parsed = postEditorSchema.safeParse({
    circleId: "circle-1",
    postType: "DISCUSSION",
    title: "第一次发帖，大家好",
    content: "这是一个用于测试的发帖内容，长度已经超过最小限制。",
    mediaUrls: "",
    globalTags: "新手报到",
    circleTags: "",
    isAnonymous: "false",
    pollQuestion: "",
    pollOptions: "",
    allowMultiple: "false",
    resultVisibility: "ALWAYS_PUBLIC",
    expiresAt: ""
  });

  assert.equal(parsed.success, true);
});

test("发帖参数：投票帖子缺少选项会被拦截", () => {
  const parsed = postEditorSchema.safeParse({
    circleId: "circle-1",
    postType: "POLL",
    title: "今晚看哪部电影",
    content: "大家投票决定今晚社群统一观影内容。",
    mediaUrls: "",
    globalTags: "",
    circleTags: "",
    isAnonymous: "false",
    pollQuestion: "今晚看哪部电影？",
    pollOptions: "只写一个选项",
    allowMultiple: "false",
    resultVisibility: "AFTER_VOTE",
    expiresAt: ""
  });

  assert.equal(parsed.success, false);
});

test("评论参数：文本和媒体都为空会被拦截", () => {
  const parsed = commentEditorSchema.safeParse({
    postId: "post-1",
    parentId: "",
    rootId: "",
    content: "",
    mediaUrls: "",
    isAnonymous: "false"
  });

  assert.equal(parsed.success, false);
});

test("评论参数：仅媒体评论可通过校验", () => {
  const parsed = commentEditorSchema.safeParse({
    postId: "post-1",
    parentId: "",
    rootId: "",
    content: "",
    mediaUrls: "https://example.com/demo.gif",
    isAnonymous: "false"
  });

  assert.equal(parsed.success, true);
});
