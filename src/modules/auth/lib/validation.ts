import { z } from "zod";

export const profileSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "昵称至少需要 2 个字符")
    .max(20, "昵称不能超过 20 个字符"),
  avatarUrl: z
    .string()
    .trim()
    .max(500, "头像地址过长")
    .optional()
    .transform((value) => value || ""),
  bio: z
    .string()
    .trim()
    .max(160, "简介不能超过 160 个字符")
    .optional()
    .transform((value) => value || "")
});

export const registerSchema = profileSchema
  .extend({
    username: z
      .string()
      .trim()
      .min(3, "用户名至少需要 3 个字符")
      .max(20, "用户名不能超过 20 个字符")
      .regex(/^[a-zA-Z0-9_]+$/, "用户名只支持字母、数字和下划线"),
    email: z.email("请输入有效邮箱地址").transform((value) => value.trim().toLowerCase()),
    password: z
      .string()
      .min(8, "密码至少需要 8 位")
      .max(64, "密码不能超过 64 位")
      .regex(/[A-Za-z]/, "密码至少包含一个字母")
      .regex(/[0-9]/, "密码至少包含一个数字"),
    confirmPassword: z.string(),
    captchaAnswer: z.string().trim().min(1, "请完成人机校验"),
    captchaToken: z.string().trim().min(1, "人机校验已过期，请刷新页面"),
    website: z.string().max(0, "请勿填写隐藏字段")
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致"
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "请输入用户名或邮箱"),
  password: z.string().min(1, "请输入密码"),
  redirectTo: z.string().trim().optional()
});

export const deleteAccountSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(6, "请简要说明注销原因，至少 6 个字符")
    .max(200, "注销原因不能超过 200 个字符")
});

export const passwordResetSchema = z.object({
  identifier: z.string().trim().min(1, "请输入用户名或邮箱"),
  newPassword: z
    .string()
    .min(8, "新密码至少需要 8 位")
    .max(64, "新密码不能超过 64 位")
    .regex(/[A-Za-z]/, "新密码至少包含一个字母")
    .regex(/[0-9]/, "新密码至少包含一个数字")
});
