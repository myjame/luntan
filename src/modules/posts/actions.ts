"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import type { ActionState } from "@/modules/auth/lib/types";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import {
  createPost,
  deletePost,
  updatePost
} from "@/modules/posts/lib/service";

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

export async function createPostAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActiveUser();
  const result = await createPost(user, formToRecord(formData));

  if (!result.ok || !("postId" in result)) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/square");
  revalidatePath("/circles");
  revalidatePath(`/circles/${result.circleSlug}`);
  revalidatePath(`/posts/${result.postId}`);

  redirect(`/posts/${result.postId}?result=created` as Route);
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

  const result = await updatePost(user, postId, formToRecord(formData));

  if (!result.ok || !("postId" in result) || !("circleSlug" in result)) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/square");
  revalidatePath("/circles");
  revalidatePath(`/circles/${result.circleSlug}`);
  revalidatePath(`/posts/${result.postId}`);
  redirect(`/posts/${result.postId}?result=updated` as Route);
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
