"use client";

import { useActionState } from "react";

import { adminResetPasswordAction } from "@/modules/auth/actions";
import { SubmitButton } from "@/modules/auth/components/submit-button";
import { initialActionState } from "@/modules/auth/lib/types";

export function AdminPasswordResetForm() {
  const [state, formAction] = useActionState(adminResetPasswordAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">目标账号</span>
        <input
          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          name="identifier"
          placeholder="输入用户名或邮箱"
          type="text"
        />
        {state.fieldErrors?.identifier ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.identifier}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">新密码</span>
        <input
          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          name="newPassword"
          placeholder="至少 8 位，包含字母和数字"
          type="password"
        />
        {state.fieldErrors?.newPassword ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.newPassword}</p>
        ) : null}
      </label>

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <SubmitButton label="重置密码" pendingLabel="提交中..." />
    </form>
  );
}
