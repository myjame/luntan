"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import type { ActionState } from "@/modules/auth/lib/types";
import { requireActiveUser, requireSuperAdmin } from "@/modules/auth/lib/guards";
import {
  addCircleManager,
  deleteCirclePostByManager,
  followCircle,
  removeCircleManager,
  reviewCircleApplication,
  submitCircleApplication,
  unfollowCircle,
  updateCircleProfile
} from "@/modules/community/lib/service";

function formToRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

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

export async function submitCircleApplicationAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActiveUser();
  const result = await submitCircleApplication(user, formToRecord(formData));

  if (!result.ok) {
    return result;
  }

  revalidatePath("/circles");
  revalidatePath("/me/circle-applications/new");
  redirect("/me/circle-applications/new?result=submitted" as Route);
}

export async function followCircleAction(formData: FormData) {
  const user = await requireActiveUser();
  const slug = formData.get("slug");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/circles");

  if (typeof slug !== "string" || !slug.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少圈子标识。"
      }) as Route
    );
  }

  const result = await followCircle(user.id, slug);

  revalidatePath("/circles");
  revalidatePath(`/circles/${slug}`);
  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "followed" : "error",
      message: result.message
    }) as Route
  );
}

export async function unfollowCircleAction(formData: FormData) {
  const user = await requireActiveUser();
  const slug = formData.get("slug");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/circles");

  if (typeof slug !== "string" || !slug.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少圈子标识。"
      }) as Route
    );
  }

  const result = await unfollowCircle(user.id, slug);

  revalidatePath("/circles");
  revalidatePath(`/circles/${slug}`);
  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "unfollowed" : "error",
      message: result.message
    }) as Route
  );
}

export async function adminReviewCircleApplicationAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const applicationId = formData.get("applicationId");
  const decision = formData.get("decision");
  const reviewNote = formData.get("reviewNote");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/circles/reviews");

  if (typeof applicationId !== "string" || !applicationId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少圈子申请标识。"
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

  const result = await reviewCircleApplication(admin, {
    applicationId,
    decision,
    reviewNote: typeof reviewNote === "string" ? reviewNote : null
  });

  revalidatePath("/circles");
  revalidatePath("/admin");
  revalidatePath("/admin/circles");
  revalidatePath("/admin/circles/reviews");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? (decision === "APPROVE" ? "approved" : "rejected") : "error",
      message: result.message
    }) as Route
  );
}

export async function updateCircleProfileAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActiveUser();
  const circleId = formData.get("circleId");

  if (typeof circleId !== "string" || !circleId.trim()) {
    return {
      ok: false,
      message: "缺少圈子标识。"
    };
  }

  const result = await updateCircleProfile(user, circleId, formToRecord(formData));

  if (!result.ok) {
    return result;
  }

  revalidatePath("/circles");
  redirect((result.redirectTo ?? "/circles") as Route);
}

export async function addCircleManagerAction(formData: FormData) {
  const user = await requireActiveUser();
  const circleId = formData.get("circleId");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/circles");

  if (typeof circleId !== "string" || !circleId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少圈子标识。"
      }) as Route
    );
  }

  const result = await addCircleManager(user, circleId, formToRecord(formData));

  revalidatePath("/circles");
  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "manager-added" : "error",
      message: result.message
    }) as Route
  );
}

export async function removeCircleManagerAction(formData: FormData) {
  const user = await requireActiveUser();
  const circleId = formData.get("circleId");
  const relationId = formData.get("relationId");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/circles");

  if (
    typeof circleId !== "string" ||
    !circleId.trim() ||
    typeof relationId !== "string" ||
    !relationId.trim()
  ) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少圈管关系标识。"
      }) as Route
    );
  }

  const result = await removeCircleManager(user, circleId, relationId);

  revalidatePath("/circles");
  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "manager-removed" : "error",
      message: result.message
    }) as Route
  );
}

export async function deleteCirclePostAction(formData: FormData) {
  const user = await requireActiveUser();
  const circleId = formData.get("circleId");
  const postId = formData.get("postId");
  const reason = formData.get("reason");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/circles");

  if (
    typeof circleId !== "string" ||
    !circleId.trim() ||
    typeof postId !== "string" ||
    !postId.trim()
  ) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少圈子或帖子标识。"
      }) as Route
    );
  }

  const result = await deleteCirclePostByManager(user, circleId, {
    postId,
    reason: typeof reason === "string" ? reason : null
  });

  revalidatePath("/");
  revalidatePath("/square");
  revalidatePath("/circles");
  revalidatePath(returnTo);
  revalidatePath(`/posts/${postId}`);

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "post-deleted" : "error",
      message: result.message
    }) as Route
  );
}
