import { z } from "zod";

import { ReportTargetType, ReportType } from "@/generated/prisma/client";
import {
  governanceActionOptions,
  userRestrictionOptions
} from "@/modules/moderation/lib/constants";

export const reportSubmissionSchema = z.object({
  targetType: z.enum([
    ReportTargetType.POST,
    ReportTargetType.COMMENT,
    ReportTargetType.USER,
    ReportTargetType.CIRCLE,
    ReportTargetType.MESSAGE
  ]),
  targetId: z.string().trim().min(1, "缺少举报目标。"),
  reportType: z.enum([
    ReportType.SEXUAL,
    ReportType.PERSONAL_ATTACK,
    ReportType.ADVERTISEMENT,
    ReportType.ILLEGAL,
    ReportType.SPAM,
    ReportType.COPYRIGHT,
    ReportType.OTHER
  ]),
  detail: z
    .string()
    .trim()
    .max(300, "补充说明请控制在 300 字以内。")
    .optional()
    .default("")
});

export const moderationReviewSchema = z.object({
  reviewNote: z
    .string()
    .trim()
    .max(300, "审核说明请控制在 300 字以内。")
    .optional()
    .default("")
});

export const reportResolutionSchema = z.object({
  reportId: z.string().trim().min(1, "缺少举报标识。"),
  action: z.enum(governanceActionOptions.map((item) => item.value) as [string, ...string[]]),
  resolutionNote: z
    .string()
    .trim()
    .max(300, "处理说明请控制在 300 字以内。")
    .optional()
    .default("")
});

export const userRestrictionSchema = z.object({
  userId: z.string().trim().min(1, "缺少用户标识。"),
  action: z.enum(userRestrictionOptions.map((item) => item.value) as [string, ...string[]]),
  reason: z
    .string()
    .trim()
    .max(300, "治理说明请控制在 300 字以内。")
    .optional()
    .default("")
});
