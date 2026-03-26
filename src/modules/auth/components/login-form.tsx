"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/modules/auth/actions";
import { initialActionState } from "@/modules/auth/lib/types";
import { SubmitButton } from "@/modules/auth/components/submit-button";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <input name="redirectTo" type="hidden" value={redirectTo ?? ""} />

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">用户名或邮箱</span>
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
        <span className="text-sm font-semibold text-slate-700">密码</span>
        <input
          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          name="password"
          placeholder="输入密码"
          type="password"
        />
        {state.fieldErrors?.password ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.password}</p>
        ) : null}
      </label>

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label="登录社区" pendingLabel="登录中..." />
        <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/register">
          还没有账号，去注册
        </Link>
      </div>
    </form>
  );
}
