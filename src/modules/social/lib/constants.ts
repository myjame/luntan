export const commentEmojiOptions = [
  {
    value: "👍",
    label: "赞同"
  },
  {
    value: "🔥",
    label: "有共鸣"
  },
  {
    value: "👏",
    label: "支持"
  },
  {
    value: "💡",
    label: "有启发"
  }
] as const;

export type CommentEmojiValue = (typeof commentEmojiOptions)[number]["value"];
