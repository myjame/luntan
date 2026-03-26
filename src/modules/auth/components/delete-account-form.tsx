"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestDeletionAction } from "@/modules/auth/actions";
import { SubmitButton } from "@/modules/auth/components/submit-button";
import { initialActionState } from "@/modules/auth/lib/types";

export function DeleteAccountForm() {
  const [state, formAction] = useActionState(requestDeletionAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">注销原因</span>
        <textarea
          className="mt-2 min-h-32 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          name="reason"
          placeholder="例如：不再使用该账号，或希望使用新账号重新加入社区。"
        />
        {state.fieldErrors?.reason ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.reason}</p>
        ) : null}
      </label>

      <div className="rounded-2xl border border-dashed border-black/12 bg-[rgba(255,255,255,0.68)] p-4 text-sm leading-7 text-slate-600">
        提交后账号会进入待注销状态，并退出当前登录。管理员审核通过后执行脱敏保留，不做历史内容硬删除。
      </div>

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label="提交注销申请" pendingLabel="提交中..." />
        <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me">
          返回个人中心
        </Link>
      </div>
    </form>
  );
}
