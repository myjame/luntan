"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { DEFAULT_LOGIN_REDIRECT } from "@/modules/auth/lib/constants";
import { clearSession, setSession } from "@/modules/auth/lib/session";
import { reviewUserRegistration } from "@/modules/auth/lib/admin";
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

function resolveReturnTo(rawValue: FormDataEntryValue | null, fallback: string) {
  return typeof rawValue === "string" && rawValue.startsWith("/") ? rawValue : fallback;
}

function buildRedirectPath(
  returnTo: string,
  payload: {
    result: "approved" | "rejected" | "error";
    message?: string;
  }
) {
  const url = new URL(returnTo, "http://localhost");

  url.searchParams.set("result", payload.result);

  if (payload.message) {
    url.searchParams.set("message", payload.message);
  }

  return `${url.pathname}${url.search}`;
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

export async function adminReviewUserAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const userId = formData.get("userId");
  const decision = formData.get("decision");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/users/reviews");
  const reviewNote = formData.get("reviewNote");

  if (typeof userId !== "string" || !userId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少待审核用户标识。"
      }) as Route
    );
  }

  if (decision !== "APPROVE" && decision !== "REJECT") {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "无效的审核动作。"
      }) as Route
    );
  }

  const result = await reviewUserRegistration(admin.id, {
    userId,
    decision,
    reviewNote: typeof reviewNote === "string" ? reviewNote : null
  });

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/reviews");
  }

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? (decision === "APPROVE" ? "approved" : "rejected") : "error",
      message: result.message
    }) as Route
  );
}
