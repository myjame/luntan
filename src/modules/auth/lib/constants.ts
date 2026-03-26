import type { AuthUserStatus } from "@/modules/auth/lib/types";

export const SESSION_COOKIE_NAME = "luntan_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
export const FALLBACK_SESSION_SECRET = "luntan-dev-session-secret-please-change-me-2026";
export const DEFAULT_LOGIN_REDIRECT = "/me";

export const authStatusMeta: Record<
  AuthUserStatus,
  {
    title: string;
    description: string;
    tone: string;
    actionLabel: string;
    actionHref: string;
  }
> = {
  PENDING_REVIEW: {
    title: "账号正在审核中",
    description: "你的注册申请已经提交，管理员审核通过后才能登录和互动。",
    tone: "待审核",
    actionLabel: "返回登录页",
    actionHref: "/login"
  },
  ACTIVE: {
    title: "账号状态正常",
    description: "当前账号已通过审核，可以正常登录和参与互动。",
    tone: "已激活",
    actionLabel: "进入个人中心",
    actionHref: "/me"
  },
  REJECTED: {
    title: "账号审核未通过",
    description: "管理员暂未通过你的注册申请，请根据提示检查信息后重新注册或联系管理员。",
    tone: "已拒绝",
    actionLabel: "重新注册",
    actionHref: "/register"
  },
  MUTED: {
    title: "账号当前处于禁言状态",
    description: "账号被限制互动能力，具体恢复时间或原因请查看平台通知。",
    tone: "禁言",
    actionLabel: "返回首页",
    actionHref: "/"
  },
  BANNED: {
    title: "账号已被封禁",
    description: "该账号已被平台封禁，当前无法继续登录或参与互动。",
    tone: "封禁",
    actionLabel: "返回首页",
    actionHref: "/"
  },
  DISABLED: {
    title: "账号已被停用",
    description: "该账号已被平台停用，如有疑问请联系管理员处理。",
    tone: "停用",
    actionLabel: "返回首页",
    actionHref: "/"
  },
  PENDING_DELETION: {
    title: "注销申请审核中",
    description: "你的注销申请已提交，平台会在审核通过后执行账号脱敏和历史内容保留处理。",
    tone: "待注销",
    actionLabel: "查看状态页",
    actionHref: "/account-status"
  }
};
