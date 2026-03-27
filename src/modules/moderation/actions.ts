"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { requireActiveUser, requireSuperAdmin } from "@/modules/auth/lib/guards";
import {
  resolveReport,
  reviewPendingComment,
  reviewPendingPost,
  submitReport,
  updateUserRestriction
} from "@/modules/moderation/lib/service";

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

export async function submitReportAction(formData: FormData) {
  const user = await requireActiveUser();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/");
  const result = await submitReport(user.id, Object.fromEntries(formData.entries()));

  revalidatePath("/admin");
  revalidatePath("/admin/moderation/reports");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "reported" : "error",
      message: result.message
    }) as Route
  );
}

export async function adminReviewPostAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const postId = formData.get("postId");
  const decision = formData.get("decision");
  const reviewNote = formData.get("reviewNote");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/moderation/reviews");

  if (typeof postId !== "string" || !postId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少帖子标识。"
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

  const result = await reviewPendingPost(admin.id, {
    postId,
    decision,
    reviewNote: typeof reviewNote === "string" ? reviewNote : ""
  });

  revalidatePath("/admin");
  revalidatePath("/admin/moderation/reviews");
  revalidatePath(`/posts/${postId}`);

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? (decision === "APPROVE" ? "approved" : "rejected") : "error",
      message: result.message
    }) as Route
  );
}

export async function adminReviewCommentAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const commentId = formData.get("commentId");
  const decision = formData.get("decision");
  const reviewNote = formData.get("reviewNote");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/moderation/reviews");
  const postPath = formData.get("postPath");

  if (typeof commentId !== "string" || !commentId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少评论标识。"
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

  const result = await reviewPendingComment(admin.id, {
    commentId,
    decision,
    reviewNote: typeof reviewNote === "string" ? reviewNote : ""
  });

  revalidatePath("/admin");
  revalidatePath("/admin/moderation/reviews");

  if (typeof postPath === "string" && postPath.startsWith("/")) {
    revalidatePath(postPath);
  }

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? (decision === "APPROVE" ? "approved" : "rejected") : "error",
      message: result.message
    }) as Route
  );
}

export async function adminResolveReportAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/moderation/reports");
  const targetPath = formData.get("targetPath");
  const result = await resolveReport(admin.id, Object.fromEntries(formData.entries()));

  revalidatePath("/admin");
  revalidatePath("/admin/moderation/reports");
  revalidatePath("/admin/moderation/users");
  revalidatePath("/admin/logs");

  if (typeof targetPath === "string" && targetPath.startsWith("/")) {
    revalidatePath(targetPath);
  }

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "resolved" : "error",
      message: result.message
    }) as Route
  );
}

export async function adminUpdateUserRestrictionAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/moderation/users");
  const result = await updateUserRestriction(admin.id, Object.fromEntries(formData.entries()));

  revalidatePath("/admin");
  revalidatePath("/admin/moderation/users");
  revalidatePath("/admin/users");
  revalidatePath("/admin/logs");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "updated" : "error",
      message: result.message
    }) as Route
  );
}
