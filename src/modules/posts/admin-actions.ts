"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/modules/auth/lib/guards";
import {
  adminDeleteComment,
  adminDeletePost,
  togglePostOperation
} from "@/modules/posts/lib/admin";

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

export async function adminTogglePostOperationAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const postId = formData.get("postId");
  const operation = formData.get("operation");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/posts");

  if (typeof postId !== "string" || !postId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少帖子标识。"
      }) as Route
    );
  }

  if (operation !== "PIN" && operation !== "FEATURE" && operation !== "RECOMMEND") {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "无效的运营动作。"
      }) as Route
    );
  }

  const result = await togglePostOperation(admin.id, {
    postId,
    operation
  });

  revalidatePath("/admin/posts");
  revalidatePath("/admin/logs");
  revalidatePath("/");
  revalidatePath("/square");
  revalidatePath(`/posts/${postId}`);

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "updated" : "error",
      message: result.message
    }) as Route
  );
}

export async function adminDeletePostAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const postId = formData.get("postId");
  const reason = formData.get("reason");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/posts");

  if (typeof postId !== "string" || !postId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少帖子标识。"
      }) as Route
    );
  }

  const result = await adminDeletePost(admin.id, {
    postId,
    reason: typeof reason === "string" ? reason : null
  });

  revalidatePath("/admin/posts");
  revalidatePath("/admin/logs");
  revalidatePath("/");
  revalidatePath("/square");
  revalidatePath(`/posts/${postId}`);

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "deleted" : "error",
      message: result.message
    }) as Route
  );
}

export async function adminDeleteCommentAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const commentId = formData.get("commentId");
  const postId = formData.get("postId");
  const reason = formData.get("reason");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/admin/comments");

  if (typeof commentId !== "string" || !commentId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少评论标识。"
      }) as Route
    );
  }

  const result = await adminDeleteComment(admin.id, {
    commentId,
    reason: typeof reason === "string" ? reason : null
  });

  revalidatePath("/admin/comments");
  revalidatePath("/admin/logs");

  if (typeof postId === "string" && postId.trim()) {
    revalidatePath(`/posts/${postId}`);
  }

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "deleted" : "error",
      message: result.message
    }) as Route
  );
}
