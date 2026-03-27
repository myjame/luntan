"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/modules/auth/lib/guards";
import {
  assignBadgeToUser,
  removeUserBadge,
  updateUserIdentityDisplay,
  upsertBadge,
  upsertBanner,
  upsertPointRule,
  upsertRecommendationSlot
} from "@/modules/operations/lib/service";

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

  return `${url.pathname}${url.search}${url.hash}`;
}

function toRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function upsertBannerAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/operations");
  const result = await upsertBanner(admin.id, toRecord(formData));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/operations");
  revalidatePath("/admin/logs");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "saved" : "error",
      message: result.message
    }) as Route
  );
}

export async function upsertRecommendationSlotAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/operations");
  const result = await upsertRecommendationSlot(admin.id, toRecord(formData));

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/square");
  revalidatePath("/admin");
  revalidatePath("/admin/operations");
  revalidatePath("/admin/logs");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "saved" : "error",
      message: result.message
    }) as Route
  );
}

export async function upsertPointRuleAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/points");
  const result = await upsertPointRule(admin.id, toRecord(formData));

  revalidatePath("/admin");
  revalidatePath("/admin/points");
  revalidatePath("/admin/logs");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "saved" : "error",
      message: result.message
    }) as Route
  );
}

export async function upsertBadgeAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/badges");
  const result = await upsertBadge(admin.id, toRecord(formData));

  revalidatePath("/admin");
  revalidatePath("/admin/badges");
  revalidatePath("/admin/logs");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "saved" : "error",
      message: result.message
    }) as Route
  );
}

export async function assignUserBadgeAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/badges");
  const result = await assignBadgeToUser(admin.id, toRecord(formData));

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/badges");
  revalidatePath("/admin/logs");
  revalidatePath("/me");
  revalidatePath("/me/points");

  if (result.ok && result.username) {
    revalidatePath(`/users/${result.username}`);
  }

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "badge-assigned" : "error",
      message: result.message
    }) as Route
  );
}

export async function removeUserBadgeAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/badges");
  const result = await removeUserBadge(admin.id, toRecord(formData));

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/badges");
  revalidatePath("/admin/logs");
  revalidatePath("/me");
  revalidatePath("/me/points");

  if (result.ok && result.username) {
    revalidatePath(`/users/${result.username}`);
  }

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "badge-removed" : "error",
      message: result.message
    }) as Route
  );
}

export async function updateUserIdentityDisplayAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/badges");
  const result = await updateUserIdentityDisplay(admin.id, toRecord(formData));

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/badges");
  revalidatePath("/admin/logs");
  revalidatePath("/me");
  revalidatePath("/me/points");

  if (result.ok && result.username) {
    revalidatePath(`/users/${result.username}`);
  }

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "identity-updated" : "error",
      message: result.message
    }) as Route
  );
}
