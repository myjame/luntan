"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { requireActiveUser } from "@/modules/auth/lib/guards";
import {
  blockUser,
  followUser,
  toggleCommentEmoji,
  togglePostFavorite,
  togglePostLike,
  unblockUser,
  unfollowUser
} from "@/modules/social/lib/service";

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

export async function togglePostLikeAction(formData: FormData) {
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

  const result = await togglePostLike(user.id, postId);

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/me");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? (result.active ? "liked" : "unliked") : "error",
      message: result.message
    }) as Route
  );
}

export async function togglePostFavoriteAction(formData: FormData) {
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

  const result = await togglePostFavorite(user.id, postId);

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/me");
  revalidatePath("/me/favorites");

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? (result.active ? "favorited" : "unfavorited") : "error",
      message: result.message
    }) as Route
  );
}

export async function toggleCommentEmojiAction(formData: FormData) {
  const user = await requireActiveUser();
  const postId = formData.get("postId");
  const commentId = formData.get("commentId");
  const emojiCode = formData.get("emojiCode");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/");

  if (typeof postId !== "string" || !postId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少帖子标识。"
      }) as Route
    );
  }

  if (typeof commentId !== "string" || !commentId.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少评论标识。"
      }) as Route
    );
  }

  if (typeof emojiCode !== "string" || !emojiCode.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少表情标识。"
      }) as Route
    );
  }

  const result = await toggleCommentEmoji({
    userId: user.id,
    commentId,
    emojiCode
  });

  revalidatePath(`/posts/${postId}`);

  redirect(
    `${buildRedirectPath(returnTo, {
      result: result.ok ? "comment-reacted" : "error",
      message: result.message
    })}#comment-${commentId}` as Route
  );
}

export async function followUserAction(formData: FormData) {
  const user = await requireActiveUser();
  const username = formData.get("username");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/");

  if (typeof username !== "string" || !username.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少用户标识。"
      }) as Route
    );
  }

  const result = await followUser(user.id, username);

  revalidatePath("/me");
  revalidatePath("/me/follows");
  revalidatePath(`/users/${username}`);

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "user-followed" : "error",
      message: result.message
    }) as Route
  );
}

export async function unfollowUserAction(formData: FormData) {
  const user = await requireActiveUser();
  const username = formData.get("username");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/");

  if (typeof username !== "string" || !username.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少用户标识。"
      }) as Route
    );
  }

  const result = await unfollowUser(user.id, username);

  revalidatePath("/me");
  revalidatePath("/me/follows");
  revalidatePath(`/users/${username}`);

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "user-unfollowed" : "error",
      message: result.message
    }) as Route
  );
}

export async function blockUserAction(formData: FormData) {
  const user = await requireActiveUser();
  const username = formData.get("username");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/");

  if (typeof username !== "string" || !username.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少用户标识。"
      }) as Route
    );
  }

  const result = await blockUser(user.id, username);

  revalidatePath("/me");
  revalidatePath("/me/follows");
  revalidatePath(`/users/${username}`);

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "user-blocked" : "error",
      message: result.message
    }) as Route
  );
}

export async function unblockUserAction(formData: FormData) {
  const user = await requireActiveUser();
  const username = formData.get("username");
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/");

  if (typeof username !== "string" || !username.trim()) {
    redirect(
      buildRedirectPath(returnTo, {
        result: "error",
        message: "缺少用户标识。"
      }) as Route
    );
  }

  const result = await unblockUser(user.id, username);

  revalidatePath("/me");
  revalidatePath("/me/follows");
  revalidatePath(`/users/${username}`);

  redirect(
    buildRedirectPath(returnTo, {
      result: result.ok ? "user-unblocked" : "error",
      message: result.message
    }) as Route
  );
}
