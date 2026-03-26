"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { DEFAULT_LOGIN_REDIRECT } from "@/modules/auth/lib/constants";
import { clearSession, setSession } from "@/modules/auth/lib/session";
import type { ActionState } from "@/modules/auth/lib/types";
import {
  adminResetPassword,
  loginUser,
  registerUser,
  requestAccountDeletion,
  updateCurrentUserProfile
} from "@/modules/auth/lib/service";
import { requireActiveUser, requireSuperAdmin } from "@/modules/auth/lib/guards";

function formToRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const result = await registerUser(formToRecord(formData));

  if (!result.ok) {
    return result;
  }

  redirect("/account-status?status=PENDING_REVIEW&source=register" as Route);
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const result = await loginUser(formToRecord(formData));

  if (!result.ok || !("session" in result)) {
    if ("status" in result && result.status) {
      redirect(`/account-status?status=${result.status}` as Route);
    }

    return result;
  }

  const session = result.session;

  if (!session) {
    return {
      ok: false,
      message: "登录态创建失败，请稍后重试。"
    };
  }

  await setSession(session);

  const redirectTo =
    typeof result.redirectTo === "string" && result.redirectTo.startsWith("/")
      ? result.redirectTo
      : DEFAULT_LOGIN_REDIRECT;

  redirect(redirectTo as Route);
}

export async function logoutAction() {
  await clearSession();
  redirect("/login" as Route);
}

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireActiveUser();

  return updateCurrentUserProfile(user.id, formToRecord(formData));
}

export async function requestDeletionAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActiveUser();
  const result = await requestAccountDeletion(user.id, formToRecord(formData));

  if (!result.ok) {
    return result;
  }

  await clearSession();
  redirect("/account-status?status=PENDING_DELETION&source=deletion" as Route);
}

export async function adminResetPasswordAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSuperAdmin();

  return adminResetPassword(formToRecord(formData));
}
