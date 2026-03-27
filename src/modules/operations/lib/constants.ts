import {
  BadgeKind,
  BannerStatus,
  PointEventType,
  RecommendationSlotType,
  RecommendationTargetType
} from "@/generated/prisma/client";

export const bannerStatusMeta: Record<
  BannerStatus,
  {
    label: string;
    className: string;
  }
> = {
  [BannerStatus.DRAFT]: {
    label: "草稿",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-700"
  },
  [BannerStatus.ACTIVE]: {
    label: "生效中",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
  },
  [BannerStatus.INACTIVE]: {
    label: "已停用",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-800"
  },
  [BannerStatus.EXPIRED]: {
    label: "已过期",
    className: "border-stone-500/20 bg-stone-500/10 text-stone-700"
  }
};

export const bannerStatusOptions = [
  { value: BannerStatus.DRAFT, label: "草稿" },
  { value: BannerStatus.ACTIVE, label: "生效中" },
  { value: BannerStatus.INACTIVE, label: "已停用" },
  { value: BannerStatus.EXPIRED, label: "已过期" }
] as const;

export const recommendationSlotTypeLabel: Record<RecommendationSlotType, string> = {
  [RecommendationSlotType.HOMEPAGE_BANNER]: "首页 Banner",
  [RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE]: "首页推荐圈子",
  [RecommendationSlotType.HOMEPAGE_ACTIVITY]: "首页推荐活动",
  [RecommendationSlotType.HOMEPAGE_TOPIC]: "首页今日话题",
  [RecommendationSlotType.SQUARE_RECOMMENDATION]: "广场推荐位",
  [RecommendationSlotType.DISCOVER_HOT]: "发现页热榜"
};

export const homeRecommendationSlotOptions = [
  {
    value: RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE,
    label: recommendationSlotTypeLabel[RecommendationSlotType.HOMEPAGE_RECOMMENDED_CIRCLE]
  },
  {
    value: RecommendationSlotType.HOMEPAGE_ACTIVITY,
    label: recommendationSlotTypeLabel[RecommendationSlotType.HOMEPAGE_ACTIVITY]
  },
  {
    value: RecommendationSlotType.HOMEPAGE_TOPIC,
    label: recommendationSlotTypeLabel[RecommendationSlotType.HOMEPAGE_TOPIC]
  }
] as const;

export const recommendationTargetTypeLabel: Record<RecommendationTargetType, string> = {
  [RecommendationTargetType.POST]: "帖子",
  [RecommendationTargetType.CIRCLE]: "圈子",
  [RecommendationTargetType.ACTIVITY]: "活动",
  [RecommendationTargetType.URL]: "链接",
  [RecommendationTargetType.TOPIC]: "话题"
};

export const recommendationTargetOptions = [
  {
    value: RecommendationTargetType.CIRCLE,
    label: recommendationTargetTypeLabel[RecommendationTargetType.CIRCLE]
  },
  {
    value: RecommendationTargetType.URL,
    label: recommendationTargetTypeLabel[RecommendationTargetType.URL]
  },
  {
    value: RecommendationTargetType.ACTIVITY,
    label: recommendationTargetTypeLabel[RecommendationTargetType.ACTIVITY]
  },
  {
    value: RecommendationTargetType.TOPIC,
    label: recommendationTargetTypeLabel[RecommendationTargetType.TOPIC]
  },
  {
    value: RecommendationTargetType.POST,
    label: recommendationTargetTypeLabel[RecommendationTargetType.POST]
  }
] as const;

export const pointEventTypeLabel: Record<PointEventType, string> = {
  [PointEventType.POST_CREATE]: "发帖",
  [PointEventType.COMMENT_CREATE]: "评论",
  [PointEventType.RECEIVE_LIKE]: "获赞",
  [PointEventType.RECEIVE_FAVORITE]: "被收藏",
  [PointEventType.MANUAL_ADJUST]: "手工调整"
};

export const pointEventTypeOptions = [
  { value: PointEventType.POST_CREATE, label: pointEventTypeLabel[PointEventType.POST_CREATE] },
  {
    value: PointEventType.COMMENT_CREATE,
    label: pointEventTypeLabel[PointEventType.COMMENT_CREATE]
  },
  { value: PointEventType.RECEIVE_LIKE, label: pointEventTypeLabel[PointEventType.RECEIVE_LIKE] },
  {
    value: PointEventType.RECEIVE_FAVORITE,
    label: pointEventTypeLabel[PointEventType.RECEIVE_FAVORITE]
  },
  {
    value: PointEventType.MANUAL_ADJUST,
    label: pointEventTypeLabel[PointEventType.MANUAL_ADJUST]
  }
] as const;

export const badgeKindLabel: Record<BadgeKind, string> = {
  [BadgeKind.BADGE]: "勋章",
  [BadgeKind.TITLE]: "头衔"
};

export const badgeKindOptions = [
  { value: BadgeKind.BADGE, label: badgeKindLabel[BadgeKind.BADGE] },
  { value: BadgeKind.TITLE, label: badgeKindLabel[BadgeKind.TITLE] }
] as const;
