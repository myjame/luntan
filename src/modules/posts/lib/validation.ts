import { z } from "zod";

function optionalTextField(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .transform((value) => value || "");
}

function checkboxToBoolean(value: unknown) {
  return value === "on" || value === "true" || value === true;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidDateTimeLocal(value: string) {
  if (!value) {
    return true;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

function parseTokenList(value: string) {
  return value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMediaUrls(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value);
}

export const postEditorSchema = z
  .object({
    circleId: z.string().trim().min(1, "缺少圈子标识"),
    postType: z.enum([
      "DISCUSSION",
      "QUESTION",
      "EXPERIENCE",
      "ANNOUNCEMENT",
      "POLL"
    ]),
    title: z
      .string()
      .trim()
      .min(4, "标题至少需要 4 个字符")
      .max(80, "标题不能超过 80 个字符"),
    content: z
      .string()
      .trim()
      .min(10, "正文至少需要 10 个字符")
      .max(12000, "正文不能超过 12000 个字符"),
    mediaUrls: optionalTextField(2000, "媒体链接输入过长"),
    globalTags: z
      .string()
      .trim()
      .max(120, "全站标签输入过长")
      .optional()
      .transform((value) => value || ""),
    circleTags: z
      .string()
      .trim()
      .max(120, "圈内标签输入过长")
      .optional()
      .transform((value) => value || ""),
    isAnonymous: z.preprocess(checkboxToBoolean, z.boolean()),
    pollQuestion: z
      .string()
      .trim()
      .max(120, "投票问题不能超过 120 个字符")
      .optional()
      .transform((value) => value || ""),
    pollOptions: z
      .string()
      .trim()
      .max(600, "投票选项输入过长")
      .optional()
      .transform((value) => value || ""),
    allowMultiple: z.preprocess(checkboxToBoolean, z.boolean()),
    resultVisibility: z
      .enum(["ALWAYS_PUBLIC", "AFTER_VOTE"])
      .default("ALWAYS_PUBLIC"),
    expiresAt: z
      .string()
      .trim()
      .max(40, "截止时间格式无效")
      .optional()
      .transform((value) => value || "")
  })
  .superRefine((data, ctx) => {
    const globalTagCount = parseTokenList(data.globalTags).length;
    const circleTagCount = parseTokenList(data.circleTags).length;
    const mediaUrls = parseMediaUrls(data.mediaUrls);

    if (globalTagCount > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["globalTags"],
        message: "全站标签最多填写 5 个"
      });
    }

    if (circleTagCount > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["circleTags"],
        message: "圈内标签最多填写 5 个"
      });
    }

    if (mediaUrls.length > 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrls"],
        message: "图片或 GIF 链接最多填写 6 个"
      });
    }

    if (mediaUrls.some((item) => !isHttpUrl(item))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrls"],
        message: "媒体链接需要是有效的 http 或 https 地址"
      });
    }

    if (data.postType !== "POLL") {
      return;
    }

    if (data.pollQuestion.length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pollQuestion"],
        message: "投票问题至少需要 4 个字符"
      });
    }

    const pollOptionList = splitLines(data.pollOptions);

    if (pollOptionList.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pollOptions"],
        message: "投票帖至少需要 2 个选项"
      });
    }

    if (pollOptionList.length > 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pollOptions"],
        message: "投票选项最多支持 8 个"
      });
    }

    if (data.expiresAt && !isValidDateTimeLocal(data.expiresAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "截止时间格式无效"
      });
    }
  });

export const commentEditorSchema = z
  .object({
    postId: z.string().trim().min(1, "缺少帖子标识"),
    parentId: optionalTextField(64, "回复标识无效"),
    rootId: optionalTextField(64, "回复标识无效"),
    content: optionalTextField(4000, "评论内容不能超过 4000 个字符"),
    mediaUrls: optionalTextField(1600, "评论媒体链接输入过长"),
    isAnonymous: z.preprocess(checkboxToBoolean, z.boolean())
  })
  .superRefine((data, ctx) => {
    const contentLength = data.content.trim().length;
    const mediaUrls = parseMediaUrls(data.mediaUrls);

    if (contentLength === 0 && mediaUrls.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "评论内容和媒体链接至少填写一项"
      });
    }

    if (contentLength > 0 && contentLength < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "评论内容不能为空"
      });
    }

    if (mediaUrls.length > 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrls"],
        message: "评论图片或 GIF 链接最多填写 4 个"
      });
    }

    if (mediaUrls.some((item) => !isHttpUrl(item))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrls"],
        message: "评论媒体链接需要是有效的 http 或 https 地址"
      });
    }
  });
