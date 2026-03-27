"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import type { ActionState } from "@/modules/auth/lib/types";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  updateComment,
  updatePost,
  voteOnPoll
} from "@/modules/posts/lib/service";

function formToRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function formToFiles(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function formToStringList(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
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

export async function createPostAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActiveUser();
  const result = await createPost(user, {
    fields: formToRecord(formData),
    attachments: formToFiles(formData, "attachments")
  });

  if (!result.ok || !("postId" in result)) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/square");
  revalidatePath("/circles");
  revalidatePath(`/circles/${result.circleSlug}`);
  revalidatePath(`/posts/${result.postId}`);

  redirect(
    (result.status === "PUBLISHED"
      ? `/posts/${result.postId}?result=created`
      : `/circles/${result.circleSlug}?result=post-pending&message=${encodeURIComponent(result.message ?? "帖子已进入审核队列。")}`) as Route
  );
}

export async function updatePostAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActiveUser();
  const postId = formData.get("postId");

  if (typeof postId !== "string" || !postId.trim()) {
    return {
      ok: false,
      message: "缺少帖子标识。"
    };
  }

  const result = await updatePost(user, postId, {
    fields: formToRecord(formData),
    attachments: formToFiles(formData, "attachments"),
    removeAttachmentIds: formToStringList(formData, "removeAttachmentIds")
  });

  if (!result.ok || !("postId" in result) || !("circleSlug" in result)) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/square");
  revalidatePath("/circles");
  revalidatePath(`/circles/${result.circleSlug}`);
  revalidatePath(`/posts/${result.postId}`);
  redirect(
    (result.status === "PUBLISHED"
      ? `/posts/${result.postId}?result=updated`
      : `/circles/${result.circleSlug}?result=post-pending&message=${encodeURIComponent(result.message ?? "帖子已进入审核队列。")}`) as Route
  );
}

export async function deletePostAction(formData: FormData) {
  const user = await requireActiveUser();
  const postId = formData.get("postId");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/");

  if (typeof postId !== "string" || !postId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少帖子标识。"
      }) as Route
    );
  }

  const result = await deletePost({
    postId,
    actorId: user.id
  });

  revalidatePath("/");
  revalidatePath("/square");
  revalidatePath("/circles");
  revalidatePath(returnTo);
  revalidatePath(`/posts/${postId}`);

  redirect(
    (result.ok && "redirectTo" in result
      ? result.redirectTo
      : buildRedirectPath(returnTo, {
          result: result.ok ? "deleted" : "error",
          message: result.message
        })) as Route
  );
}

export async function createCommentAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActiveUser();
  const result = await createComment(user, formToRecord(formData));
  const postId = formData.get("postId");

  if (!result.ok) {
    return result;
  }

  if (typeof postId === "string" && postId.trim()) {
    revalidatePath(`/posts/${postId}`);
  }

  redirect(
    `/posts/${postId}?result=${result.status === "PUBLISHED" ? "comment-created" : "comment-pending"}#comments` as Route
  );
}

export async function updateCommentAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActiveUser();
  const commentId = formData.get("commentId");
  const postId = formData.get("postId");

  if (typeof commentId !== "string" || !commentId.trim()) {
    return {
      ok: false,
      message: "缺少评论标识。"
    };
  }

  const result = await updateComment(user, commentId, formToRecord(formData));

  if (!result.ok) {
    return result;
  }

  if (typeof postId === "string" && postId.trim()) {
    revalidatePath(`/posts/${postId}`);
    redirect(
      `/posts/${postId}?result=${result.status === "PUBLISHED" ? "comment-updated" : "comment-pending"}#comment-${commentId}` as Route
    );
  }

  redirect("/" as Route);
}

export async function deleteCommentAction(formData: FormData) {
  const user = await requireActiveUser();
  const commentId = formData.get("commentId");
  const postId = formData.get("postId");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/");

  if (typeof commentId !== "string" || !commentId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少评论标识。"
      }) as Route
    );
  }

  const result = await deleteComment({
    commentId,
    actorId: user.id
  });

  if (typeof postId === "string" && postId.trim()) {
    revalidatePath(`/posts/${postId}`);
  }

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "comment-deleted" : "error",
      message: result.message
    }) as Route
  );
}

export async function votePollAction(formData: FormData) {
  const user = await requireActiveUser();
  const postId = formData.get("postId");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/");

  if (typeof postId !== "string" || !postId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少帖子标识。"
      }) as Route
    );
  }

  const result = await voteOnPoll({
    postId,
    userId: user.id,
    optionIds: formToStringList(formData, "optionIds")
  });

  revalidatePath(`/posts/${postId}`);

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "voted" : "error",
      message: result.message
    }) as Route
  );
}
