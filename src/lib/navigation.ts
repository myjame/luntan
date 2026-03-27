export const siteNavigation: Array<{ href: string; label: string }> = [
  { href: "/", label: "首页" },
  { href: "/square", label: "广场" },
  { href: "/discover", label: "发现" },
  { href: "/circles", label: "圈子" }
];

export const userQuickLinks: Array<{ href: string; label: string; description: string }> = [
  { href: "/me", label: "我的主页", description: "身份展示、关注关系和最近活跃。" },
  { href: "/me/notifications", label: "我的通知", description: "查看点赞、评论、回复、关注和私信提醒。" },
  { href: "/me/messages", label: "我的私信", description: "查看会话列表并继续发送站内私信。" },
  { href: "/me/posts", label: "我的帖子", description: "查看自己发布的帖子和内容沉淀。" },
  { href: "/me/comments", label: "我的评论", description: "回看自己的评论、回复和互动痕迹。" },
  { href: "/me/favorites", label: "我的收藏", description: "集中查看收藏过的帖子内容。" },
  { href: "/me/follows", label: "关注与粉丝", description: "管理关注关系和粉丝列表。" },
  {
    href: "/me/circle-applications/new",
    label: "圈子申请",
    description: "提交圈子创建申请，并查看自己的审核进度。"
  },
  { href: "/me/settings", label: "账号设置", description: "维护昵称、头像、简介和基础资料。" },
  { href: "/me/delete-account", label: "注销申请", description: "发起注销申请并进入管理员审核流程。" },
  { href: "/account-status", label: "状态说明", description: "查看账号状态拦截说明和后续动作。" }
];

export const adminSections: Array<{
  href: string;
  label: string;
  description: string;
}> = [
  { href: "/admin", label: "后台首页", description: "总览审核队列、治理入口和后台节奏。" },
  { href: "/admin/users/reviews", label: "用户审核", description: "处理注册申请并直接影响账号登录权限。" },
  { href: "/admin/users", label: "用户管理", description: "查看用户状态、角色和历史审核结果。" },
  { href: "/admin/circles/reviews", label: "圈子审核", description: "处理圈子创建申请并决定是否上线。" },
  { href: "/admin/circles", label: "圈子管理", description: "查看圈子状态、圈主信息和基础运营数据。" },
  { href: "/admin/posts", label: "帖子管理", description: "处理帖子置顶、精华、推荐和后台删帖动作。" },
  { href: "/admin/comments", label: "评论管理", description: "查看评论状态并执行管理员删评。" },
  { href: "/admin/moderation/reviews", label: "内容审核", description: "处理新用户和风险词命中的待审内容。" },
  { href: "/admin/moderation/reports", label: "举报处理", description: "对举报执行结案、删帖删评、禁言和封号。" },
  { href: "/admin/moderation/users", label: "治理用户", description: "统一维护禁言、封禁和解除限制动作。" },
  { href: "/admin/moderation/sensitive-words", label: "敏感词", description: "查看拦截、送审和提示修改规则。" },
  { href: "/admin/logs", label: "操作日志", description: "按动作、实体和时间查询后台治理记录。" },
  { href: "/admin/password-reset", label: "密码重置", description: "超级管理员手工重置账号密码。" }
];
