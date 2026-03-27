import {
  ReportStatus,
  ReportTargetType,
  ReportType,
  SensitiveWordAction,
  SensitiveWordLevel,
  UserStatus
} from "@/generated/prisma/client";

export const reportTypeOptions: Array<{ value: ReportType; label: string }> = [
  { value: ReportType.SEXUAL, label: "色情低俗" },
  { value: ReportType.PERSONAL_ATTACK, label: "人身攻击" },
  { value: ReportType.ADVERTISEMENT, label: "广告引流" },
  { value: ReportType.ILLEGAL, label: "违法违规" },
  { value: ReportType.SPAM, label: "垃圾内容" },
  { value: ReportType.COPYRIGHT, label: "侵权投诉" },
  { value: ReportType.OTHER, label: "其他" }
];

export const reportTargetTypeOptions: Array<{ value: ReportTargetType; label: string }> = [
  { value: ReportTargetType.POST, label: "帖子" },
  { value: ReportTargetType.COMMENT, label: "评论" },
  { value: ReportTargetType.USER, label: "用户" },
  { value: ReportTargetType.CIRCLE, label: "圈子" },
  { value: ReportTargetType.MESSAGE, label: "私信" }
];

export const reportStatusMeta: Record<
  ReportStatus,
  {
    label: string;
    className: string;
  }
> = {
  [ReportStatus.PENDING]: {
    label: "待处理",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-800"
  },
  [ReportStatus.PROCESSING]: {
    label: "处理中",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-800"
  },
  [ReportStatus.RESOLVED]: {
    label: "已处理",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
  },
  [ReportStatus.REJECTED]: {
    label: "已驳回",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-700"
  }
};

export const governanceUserStatusMeta: Partial<
  Record<
    UserStatus,
    {
      label: string;
      className: string;
    }
  >
> = {
  [UserStatus.ACTIVE]: {
    label: "正常",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
  },
  [UserStatus.MUTED]: {
    label: "禁言中",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-800"
  },
  [UserStatus.BANNED]: {
    label: "已封禁",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-800"
  }
};

export const sensitiveWordLevelMeta: Record<
  SensitiveWordLevel,
  {
    label: string;
    className: string;
  }
> = {
  [SensitiveWordLevel.SEVERE]: {
    label: "严重词",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-800"
  },
  [SensitiveWordLevel.SUSPECT]: {
    label: "疑似词",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-800"
  },
  [SensitiveWordLevel.GENERAL]: {
    label: "提示词",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-700"
  }
};

export const sensitiveWordActionLabel: Record<SensitiveWordAction, string> = {
  [SensitiveWordAction.BLOCK]: "直接拦截",
  [SensitiveWordAction.REVIEW]: "进入审核",
  [SensitiveWordAction.WARN]: "提示修改"
};

export const contentReviewThreshold = {
  postCount: 3,
  commentCount: 5
} as const;

export const governanceActionOptions = [
  { value: "RESOLVE_ONLY", label: "仅结案" },
  { value: "DELETE_POST", label: "删帖并结案" },
  { value: "DELETE_COMMENT", label: "删评并结案" },
  { value: "MUTE_3_DAYS", label: "禁言 3 天" },
  { value: "MUTE_7_DAYS", label: "禁言 7 天" },
  { value: "BAN_USER", label: "封禁账号" },
  { value: "REJECT_REPORT", label: "驳回举报" }
] as const;

export type GovernanceActionValue = (typeof governanceActionOptions)[number]["value"];

export const userRestrictionOptions = [
  { value: "MUTE_1_DAY", label: "禁言 1 天" },
  { value: "MUTE_3_DAYS", label: "禁言 3 天" },
  { value: "MUTE_7_DAYS", label: "禁言 7 天" },
  { value: "UNMUTE", label: "解除禁言" },
  { value: "BAN", label: "封禁账号" },
  { value: "UNBAN", label: "解除封禁" }
] as const;

export type UserRestrictionValue = (typeof userRestrictionOptions)[number]["value"];

export function getReportTypeLabel(type: ReportType) {
  return reportTypeOptions.find((item) => item.value === type)?.label ?? type;
}

export function getReportTargetTypeLabel(type: ReportTargetType) {
  return reportTargetTypeOptions.find((item) => item.value === type)?.label ?? type;
}
