export const postTypeOptions = [
  {
    value: "DISCUSSION",
    label: "讨论帖",
    description: "适合发起观点交流、日常闲聊和主题讨论。"
  },
  {
    value: "QUESTION",
    label: "提问帖",
    description: "适合向圈友请教问题，强调信息收集和解答。"
  },
  {
    value: "EXPERIENCE",
    label: "经验帖",
    description: "适合沉淀攻略、心得、长文复盘和系统分享。"
  },
  {
    value: "ANNOUNCEMENT",
    label: "公告帖",
    description: "仅圈主、圈管或超级管理员可以发布。"
  },
  {
    value: "POLL",
    label: "投票帖",
    description: "支持单选、多选、截止时间和结果可见规则。"
  }
] as const;

export type PostTypeValue = (typeof postTypeOptions)[number]["value"];

export const homeFeedChannelOptions = [
  {
    value: "RECOMMENDED",
    label: "推荐",
    description: "默认入口，优先看推荐和被置顶的内容。"
  },
  {
    value: "HOT",
    label: "热门",
    description: "按当前热度和互动强度查看内容。"
  },
  {
    value: "NEWEST",
    label: "最新",
    description: "按发布时间倒序查看最新帖子。"
  },
  {
    value: "FOLLOWING",
    label: "关注动态",
    description: "查看你已关注圈子的最新内容。"
  }
] as const;

export type HomeFeedChannelValue = (typeof homeFeedChannelOptions)[number]["value"];

export const squareSortOptions = [
  {
    value: "HOT",
    label: "热门",
    description: "优先看当前热度更高的公共内容。"
  },
  {
    value: "NEWEST",
    label: "最新",
    description: "按最新发布时间倒序查看。"
  }
] as const;

export type SquareSortValue = (typeof squareSortOptions)[number]["value"];

export const pollResultVisibilityOptions = [
  {
    value: "ALWAYS_PUBLIC",
    label: "结果始终公开"
  },
  {
    value: "AFTER_VOTE",
    label: "投票后可见"
  }
] as const;

export type PollResultVisibilityValue =
  (typeof pollResultVisibilityOptions)[number]["value"];

export const attachmentExtensionAllowlist = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "zip"
] as const;

export const attachmentAccept = ".pdf,.doc,.docx,.xls,.xlsx,.zip";

export const maxAttachmentCount = 6;

export const maxAttachmentSizeBytes = 10 * 1024 * 1024;

const postTypeMeta: Record<
  PostTypeValue,
  { label: string; className: string; shortLabel: string }
> = {
  DISCUSSION: {
    label: "讨论帖",
    shortLabel: "讨论",
    className: "bg-[rgba(197,94,61,0.1)] text-[var(--color-accent)]"
  },
  QUESTION: {
    label: "提问帖",
    shortLabel: "提问",
    className: "bg-[rgba(23,107,108,0.1)] text-[var(--color-teal)]"
  },
  EXPERIENCE: {
    label: "经验帖",
    shortLabel: "经验",
    className: "bg-[rgba(181,138,56,0.14)] text-[var(--color-gold)]"
  },
  ANNOUNCEMENT: {
    label: "公告帖",
    shortLabel: "公告",
    className: "bg-[rgba(24,32,45,0.1)] text-slate-800"
  },
  POLL: {
    label: "投票帖",
    shortLabel: "投票",
    className: "bg-[rgba(90,91,201,0.12)] text-indigo-700"
  }
};

export function getPostTypeMeta(type: PostTypeValue) {
  return postTypeMeta[type];
}
