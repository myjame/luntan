import { z } from "zod";

function optionalUrlField(label: string) {
  return z
    .string()
    .trim()
    .max(500, `${label}过长`)
    .optional()
    .transform((value) => value || "")
    .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), `${label}需要是有效链接`);
}

function checkboxToBoolean(value: unknown) {
  return value === "on" || value === "true" || value === true;
}

const circleBaseSchema = z.object({
  categoryId: z.string().trim().min(1, "请选择圈子分类"),
  name: z
    .string()
    .trim()
    .min(2, "圈子名称至少需要 2 个字符")
    .max(24, "圈子名称不能超过 24 个字符"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "圈子 slug 至少需要 3 个字符")
    .max(32, "圈子 slug 不能超过 32 个字符")
    .regex(/^[a-z0-9-]+$/, "圈子 slug 仅支持小写字母、数字和中划线"),
  coverUrl: optionalUrlField("封面链接"),
  iconUrl: optionalUrlField("图标链接"),
  intro: z
    .string()
    .trim()
    .min(10, "圈子简介至少需要 10 个字符")
    .max(180, "圈子简介不能超过 180 个字符"),
  rules: z
    .string()
    .trim()
    .min(6, "圈规至少需要 6 个字符")
    .max(600, "圈规不能超过 600 个字符"),
  announcement: z
    .string()
    .trim()
    .max(240, "公告不能超过 240 个字符")
    .optional()
    .transform((value) => value || ""),
  allowAnonymous: z.preprocess(checkboxToBoolean, z.boolean())
});

export const circleApplicationSchema = circleBaseSchema.omit({
  announcement: true
});

export const circleProfileSchema = circleBaseSchema;

export const circleManagerSchema = z.object({
  username: z.string().trim().min(1, "请输入要添加的用户名")
});

export const circleReviewSchema = z.object({
  applicationId: z.string().trim().min(1, "缺少圈子申请标识"),
  decision: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z
    .string()
    .trim()
    .max(240, "审核说明不能超过 240 个字符")
    .optional()
    .transform((value) => value || "")
});
