import {
  DirectMessagePermission,
  HomeFeedChannel,
  UserRole,
  UserStatus,
  type UserStatus as PrismaUserStatus
} from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

import { verifyCaptchaChallenge } from "@/modules/auth/lib/captcha";
import { hashPassword, verifyPassword } from "@/modules/auth/lib/password";
import type { SessionPayload } from "@/modules/auth/lib/types";
import {
  deleteAccountSchema,
  loginSchema,
  passwordResetSchema,
  profileSchema,
  registerSchema
} from "@/modules/auth/lib/validation";

function validationErrors(error: unknown) {
  if (!(error instanceof Error) || !("issues" in error)) {
    return undefined;
  }

  const issues = (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues;

  return Object.fromEntries(
    issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])
  ) as Record<string, string>;
}

export async function registerUser(rawInput: Record<string, FormDataEntryValue | undefined>) {
  const parsed = registerSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查注册信息后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const captchaValid = await verifyCaptchaChallenge(parsed.data.captchaToken, parsed.data.captchaAnswer);

  if (!captchaValid) {
    return {
      ok: false,
      message: "人机校验未通过，请刷新页面后重试。",
      fieldErrors: {
        captchaAnswer: "人机校验答案不正确或已过期"
      }
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: parsed.data.username }, { email: parsed.data.email }]
    },
    select: {
      username: true,
      email: true
    }
  });

  if (existingUser?.username === parsed.data.username) {
    return {
      ok: false,
      message: "用户名已存在，请换一个试试。",
      fieldErrors: {
        username: "用户名已被占用"
      }
    };
  }

  if (existingUser?.email === parsed.data.email) {
    return {
      ok: false,
      message: "邮箱已注册，请直接登录或更换邮箱。",
      fieldErrors: {
        email: "邮箱已被使用"
      }
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      username: parsed.data.username,
      email: parsed.data.email,
      passwordHash,
      status: UserStatus.PENDING_REVIEW,
      role: UserRole.USER,
      profile: {
        create: {
          nickname: parsed.data.nickname,
          avatarUrl: parsed.data.avatarUrl || null,
          bio: parsed.data.bio || null
        }
      },
      settings: {
        create: {
          directMessagePermission: DirectMessagePermission.FOLLOWING_ONLY,
          homepageLastFeedChannel: HomeFeedChannel.RECOMMENDED
        }
      }
    }
  });

  return {
    ok: true,
    message: "注册成功，账号已进入审核队列。"
  };
}

function mapStatusToMessage(status: PrismaUserStatus) {
  switch (status) {
    case UserStatus.PENDING_REVIEW:
      return "账号正在审核中，暂时不能登录。";
    case UserStatus.REJECTED:
      return "账号审核未通过，请根据提示重新注册或联系管理员。";
    case UserStatus.MUTED:
      return "账号当前处于禁言状态。";
    case UserStatus.BANNED:
      return "账号已被封禁。";
    case UserStatus.DISABLED:
      return "账号已被停用。";
    case UserStatus.PENDING_DELETION:
      return "账号正在等待注销审核。";
    default:
      return "账号状态异常，暂时不能登录。";
  }
}

export async function loginUser(rawInput: Record<string, FormDataEntryValue | undefined>) {
  const parsed = loginSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请填写完整的登录信息。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const identifier = parsed.data.identifier.toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: parsed.data.identifier.trim() }, { email: identifier }]
    },
    include: {
      profile: true
    }
  });

  if (!user) {
    return {
      ok: false,
      message: "用户名、邮箱或密码不正确。"
    };
  }

  const passwordValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!passwordValid) {
    return {
      ok: false,
      message: "用户名、邮箱或密码不正确。"
    };
  }

  if (user.status !== UserStatus.ACTIVE) {
    return {
      ok: false,
      status: user.status,
      message: mapStatusToMessage(user.status)
    } as const;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return {
    ok: true,
    redirectTo: parsed.data.redirectTo,
    session: {
      userId: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      nickname: user.profile?.nickname ?? null
    } satisfies SessionPayload
  };
}

export async function updateCurrentUserProfile(
  userId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = profileSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查资料后再保存。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      nickname: parsed.data.nickname,
      avatarUrl: parsed.data.avatarUrl || null,
      bio: parsed.data.bio || null
    },
    create: {
      userId,
      nickname: parsed.data.nickname,
      avatarUrl: parsed.data.avatarUrl || null,
      bio: parsed.data.bio || null
    }
  });

  return {
    ok: true,
    message: "资料已保存。"
  };
}

export async function requestAccountDeletion(
  userId: string,
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = deleteAccountSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请填写注销原因后再提交。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const existingRequest = await prisma.accountDeletionRequest.findFirst({
    where: {
      userId,
      status: "PENDING"
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existingRequest) {
    await prisma.accountDeletionRequest.update({
      where: { id: existingRequest.id },
      data: {
        reason: parsed.data.reason
      }
    });
  } else {
    await prisma.accountDeletionRequest.create({
      data: {
        userId,
        reason: parsed.data.reason
      }
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: UserStatus.PENDING_DELETION,
      deletionRequestedAt: new Date()
    }
  });

  return {
    ok: true,
    message: "注销申请已提交，后续将进入管理员审核。"
  };
}

export async function adminResetPassword(
  rawInput: Record<string, FormDataEntryValue | undefined>
) {
  const parsed = passwordResetSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "请检查重置密码信息。",
      fieldErrors: validationErrors(parsed.error)
    };
  }

  const identifier = parsed.data.identifier.toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: parsed.data.identifier.trim() }, { email: identifier }]
    }
  });

  if (!user) {
    return {
      ok: false,
      message: "未找到对应账号。"
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword)
    }
  });

  return {
    ok: true,
    message: `已重置 ${user.username} 的密码。`
  };
}
