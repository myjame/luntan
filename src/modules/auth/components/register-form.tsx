"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerAction } from "@/modules/auth/actions";
import { initialActionState } from "@/modules/auth/lib/types";
import { SubmitButton } from "@/modules/auth/components/submit-button";

export function RegisterForm({
  captchaQuestion,
  captchaToken
}: {
  captchaQuestion: string;
  captchaToken: string;
}) {
  const [state, formAction] = useActionState(registerAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <input name="captchaToken" type="hidden" value={captchaToken} />
      <input
        autoComplete="off"
        className="hidden"
        name="website"
        tabIndex={-1}
        type="text"
      />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">用户名</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="username"
            placeholder="如 myjame_01"
            type="text"
          />
          {state.fieldErrors?.username ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.username}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">邮箱</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="email"
            placeholder="name@example.com"
            type="email"
          />
          {state.fieldErrors?.email ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.email}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">昵称</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="nickname"
            placeholder="社区展示昵称"
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
            name="avatarUrl"
            placeholder="可选，先支持链接"
            type="url"
          />
          {state.fieldErrors?.avatarUrl ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.avatarUrl}</p>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">个人简介</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          name="bio"
          placeholder="可选，介绍一下你想在社区里分享什么"
        />
        {state.fieldErrors?.bio ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.bio}</p>
        ) : null}
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">密码</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="password"
            placeholder="至少 8 位，包含字母和数字"
            type="password"
          />
          {state.fieldErrors?.password ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.password}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">确认密码</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="confirmPassword"
            placeholder="再次输入密码"
            type="password"
          />
          {state.fieldErrors?.confirmPassword ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">
              {state.fieldErrors.confirmPassword}
            </p>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">人机校验</span>
        <div className="mt-2 rounded-2xl border border-dashed border-black/12 bg-[rgba(255,255,255,0.72)] p-4">
          <p className="text-sm text-slate-600">请填写：{captchaQuestion}</p>
          <input
            className="mt-3 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="captchaAnswer"
            placeholder="输入结果"
            type="text"
          />
        </div>
        {state.fieldErrors?.captchaAnswer ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.captchaAnswer}</p>
        ) : null}
      </label>

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label="提交注册申请" pendingLabel="正在提交..." />
        <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/login">
          已有账号，去登录
        </Link>
      </div>
    </form>
  );
}
