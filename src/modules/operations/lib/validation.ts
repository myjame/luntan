import {
  BadgeKind,
  BannerStatus,
  PointEventType,
  RecommendationSlotType,
  RecommendationTargetType
} from "@/generated/prisma/client";
import { z } from "zod";

function optionalTrimmedString(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();

      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().max(maxLength).optional()
  );
}

function optionalId() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();

      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().min(1).optional()
  );
}

export const bannerSchema = z.object({
  id: optionalId(),
  title: z.string().trim().min(1, "请填写 Banner 标题。").max(80, "Banner 标题不能超过 80 个字符。"),
  subtitle: optionalTrimmedString(160),
  imageUrl: z.string().trim().min(1, "请填写 Banner 图片地址。").max(500, "图片地址不能超过 500 个字符。"),
  linkUrl: optionalTrimmedString(500),
  sortOrder: z.coerce.number().int().min(0, "排序值不能小于 0。").max(999, "排序值不能超过 999。"),
  status: z.nativeEnum(BannerStatus),
  startsAt: optionalTrimmedString(20),
  endsAt: optionalTrimmedString(20)
});

export const recommendationSlotSchema = z.object({
  id: optionalId(),
  slotType: z.nativeEnum(RecommendationSlotType),
  targetType: z.nativeEnum(RecommendationTargetType),
  title: z.string().trim().min(1, "请填写推荐位标题。").max(80, "推荐位标题不能超过 80 个字符。"),
  description: optionalTrimmedString(200),
  targetId: optionalTrimmedString(100),
  imageUrl: optionalTrimmedString(500),
  linkUrl: optionalTrimmedString(500),
  sortOrder: z.coerce.number().int().min(0, "排序值不能小于 0。").max(999, "排序值不能超过 999。"),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
  startsAt: optionalTrimmedString(20),
  endsAt: optionalTrimmedString(20)
});

export const pointRuleSchema = z.object({
  id: optionalId(),
  eventType: z.nativeEnum(PointEventType),
  name: z.string().trim().min(1, "请填写规则名称。").max(60, "规则名称不能超过 60 个字符。"),
  description: optionalTrimmedString(160),
  points: z.coerce.number().int().min(-999, "积分变动不能小于 -999。").max(999, "积分变动不能超过 999。"),
  dailyLimit: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();

      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.coerce.number().int().min(1, "每日上限至少为 1。").max(999, "每日上限不能超过 999。").optional()
  ),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true")
});

export const badgeSchema = z.object({
  id: optionalId(),
  kind: z.nativeEnum(BadgeKind),
  name: z.string().trim().min(1, "请填写勋章或头衔名称。").max(60, "名称不能超过 60 个字符。"),
  description: optionalTrimmedString(160),
  iconUrl: optionalTrimmedString(500),
  grantCondition: optionalTrimmedString(300),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true")
});
