import { z } from "zod";

function optionalTextField(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .transform((value) => value || "");
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

export const messageEditorSchema = z
  .object({
    conversationId: optionalTextField(64, "会话标识无效"),
    recipientUsername: optionalTextField(32, "收件人无效"),
    content: optionalTextField(2000, "消息内容不能超过 2000 个字符"),
    mediaUrls: optionalTextField(1600, "媒体链接输入过长")
  })
  .superRefine((data, ctx) => {
    const mediaUrls = parseMediaUrls(data.mediaUrls);

    if (!data.conversationId && !data.recipientUsername) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientUsername"],
        message: "缺少私信对象"
      });
    }

    if (data.content.length === 0 && mediaUrls.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "消息内容和媒体链接至少填写一项"
      });
    }

    if (mediaUrls.length > 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrls"],
        message: "单次最多发送 4 个图片 / GIF 链接"
      });
    }

    if (mediaUrls.some((item) => !isHttpUrl(item))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaUrls"],
        message: "媒体链接需要是有效的 http 或 https 地址"
      });
    }
  });
