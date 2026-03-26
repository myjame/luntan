"use client";

import { useActionState } from "react";

import { submitCircleApplicationAction } from "@/modules/community/actions";
import { SubmitButton } from "@/modules/auth/components/submit-button";
import { initialActionState } from "@/modules/auth/lib/types";

type CircleCategoryOption = {
  id: string;
  name: string;
};

export function CircleApplicationForm({
  categories
}: {
  categories: CircleCategoryOption[];
}) {
  const [state, formAction] = useActionState(submitCircleApplicationAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">圈子分类</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue=""
            name="categoryId"
          >
            <option disabled value="">
              选择一级分类
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoryId ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.categoryId}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">圈子名称</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="name"
            placeholder="如 观影研究所"
            type="text"
          />
          {state.fieldErrors?.name ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.name}</p>
          ) : null}
        </label>

        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">圈子 slug</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="slug"
            placeholder="如 movie-club"
            type="text"
          />
          {state.fieldErrors?.slug ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.slug}</p>
          ) : null}
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">封面链接</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="coverUrl"
            placeholder="可选，先支持链接"
            type="url"
          />
          {state.fieldErrors?.coverUrl ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.coverUrl}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">图标链接</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            name="iconUrl"
            placeholder="可选，先支持链接"
            type="url"
          />
          {state.fieldErrors?.iconUrl ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.iconUrl}</p>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">圈子简介</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          name="intro"
          placeholder="介绍圈子想承接什么内容和人群"
        />
        {state.fieldErrors?.intro ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.intro}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">圈规</span>
        <textarea
          className="mt-2 min-h-32 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          name="rules"
          placeholder="如 理性讨论、不剧透、不人身攻击"
        />
        {state.fieldErrors?.rules ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.rules}</p>
        ) : null}
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/72 px-4 py-4">
        <input className="h-4 w-4 accent-[var(--color-accent)]" name="allowAnonymous" type="checkbox" />
        <span className="text-sm text-slate-700">允许圈内匿名发言</span>
      </label>

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <SubmitButton label="提交圈子申请" pendingLabel="提交中..." />
    </form>
  );
}
