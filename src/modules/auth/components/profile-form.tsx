"use client";

import { useActionState } from "react";

import { updateProfileAction } from "@/modules/auth/actions";
import { SubmitButton } from "@/modules/auth/components/submit-button";
import { initialActionState } from "@/modules/auth/lib/types";

export function ProfileForm({
  nickname,
  avatarUrl,
  bio
}: {
  nickname: string;
  avatarUrl: string;
  bio: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">昵称</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={nickname}
            name="nickname"
            type="text"
          />
          {state.fieldErrors?.nickname ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.nickname}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">头像地址</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={avatarUrl}
            name="avatarUrl"
            type="url"
          />
          {state.fieldErrors?.avatarUrl ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.avatarUrl}</p>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">简介</span>
        <textarea
          className="mt-2 min-h-32 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={bio}
          name="bio"
        />
        {state.fieldErrors?.bio ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.bio}</p>
        ) : null}
      </label>

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <SubmitButton label="保存资料" pendingLabel="保存中..." />
    </form>
  );
}
