export const siteNavigation: Array<{ href: string; label: string }> = [
  { href: "/", label: "首页" },
  { href: "/square", label: "广场" },
  { href: "/discover", label: "发现" },
  { href: "/circles", label: "圈子" }
];

export const userQuickLinks: Array<{ href: string; label: string; description: string }> = [
  { href: "/me", label: "我的主页", description: "身份展示、关注关系和最近活跃。" },
  { href: "/me/settings", label: "账号设置", description: "维护昵称、头像、简介和基础资料。" },
  { href: "/me/delete-account", label: "注销申请", description: "发起注销申请并进入管理员审核流程。" },
  { href: "/account-status", label: "状态说明", description: "查看账号状态拦截说明和后续动作。" }
];

export const adminSections = [
  { label: "用户审核", description: "处理注册申请和账号状态变更。" },
  { label: "内容审核", description: "承接新用户观察期和敏感词拦截。" },
  { label: "圈子管理", description: "审核圈子申请并维护运营秩序。" },
  { label: "运营位", description: "配置 banner、推荐圈子和活动入口。" }
];
