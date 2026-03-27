"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { requireActiveUser } from "@/modules/auth/lib/guards";
import {
  markAllNotificationsRead,
  markNotificationRead
} from "@/modules/notifications/lib/service";

function resolveReturnTo(rawValue: FormDataEntryValue | null, fallback: string) {
  return typeof rawValue === "string" && rawValue.startsWith("/") ? rawValue : fallback;
}

function buildRedirectPath(
  returnTo: string,
  payload: {
    result: string;
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

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireActiveUser();
  const notificationId = formData.get("notificationId");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/me/notifications");

  if (typeof notificationId !== "string" || !notificationId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少通知标识。"
      }) as Route
    );
  }

  const result = await markNotificationRead(user.id, notificationId);

  revalidatePath("/me/notifications");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "read" : "error",
      message: result.message
    }) as Route
  );
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const user = await requireActiveUser();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/me/notifications");
  const result = await markAllNotificationsRead(user.id);

  revalidatePath("/me/notifications");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "all-read" : "error",
      message: result.message
    }) as Route
  );
}
