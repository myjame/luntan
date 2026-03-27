"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import type { ActionState } from "@/modules/auth/lib/types";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { sendDirectMessage } from "@/modules/messages/lib/service";

function formToRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function sendDirectMessageAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireActiveUser();
  const result = await sendDirectMessage(user, formToRecord(formData));

  if (!result.ok || !("conversationId" in result)) {
    return result;
  }

  revalidatePath("/me/messages");
  revalidatePath(`/me/messages/${result.conversationId}`);
  revalidatePath("/me/notifications");

  redirect(`/me/messages/${result.conversationId}?result=sent` as Route);
}
