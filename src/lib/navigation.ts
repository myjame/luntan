import type { Route } from "next";

export const siteNavigation: Array<{ href: Route; label: string }> = [
  { href: "/", label: "首页" },
  { href: "/square", label: "广场" },
  { href: "/discover", label: "发现" },
  { href: "/circles", label: "圈子" }
];

export const userQuickLinks = [
  { label: "我的主页", description: "身份展示、关注关系和最近活跃。" },
  { label: "我的通知", description: "点赞、评论、私信与审核结果汇总。" },
  { label: "我的收藏", description: "沉淀值得回看和二次分享的内容。" },
  { label: "隐私设置", description: "私信权限、匿名能力和资料展示。" }
];

export const adminSections = [
  { label: "用户审核", description: "处理注册申请和账号状态变更。" },
  { label: "内容审核", description: "承接新用户观察期和敏感词拦截。" },
  { label: "圈子管理", description: "审核圈子申请并维护运营秩序。" },
  { label: "运营位", description: "配置 banner、推荐圈子和活动入口。" }
];
