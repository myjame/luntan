"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/modules/auth/components/submit-button";
import { initialActionState } from "@/modules/auth/lib/types";
import { updateCircleProfileAction } from "@/modules/community/actions";

type CircleCategoryOption = {
  id: string;
  name: string;
};

type CircleSettingsValues = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  coverUrl: string | null;
  iconUrl: string | null;
  intro: string | null;
  rules: string | null;
  announcement: string | null;
  allowAnonymous: boolean;
};

export function CircleSettingsForm({
  categories,
  values
}: {
  categories: CircleCategoryOption[];
  values: CircleSettingsValues;
}) {
  const [state, formAction] = useActionState(updateCircleProfileAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <input name="circleId" type="hidden" value={values.id} />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">圈子分类</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={values.categoryId}
            name="categoryId"
          >
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
            defaultValue={values.name}
            name="name"
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
            defaultValue={values.slug}
            name="slug"
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
            defaultValue={values.coverUrl ?? ""}
            name="coverUrl"
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
            defaultValue={values.iconUrl ?? ""}
            name="iconUrl"
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
          defaultValue={values.intro ?? ""}
          name="intro"
        />
        {state.fieldErrors?.intro ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.intro}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">圈规</span>
        <textarea
          className="mt-2 min-h-32 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={values.rules ?? ""}
          name="rules"
        />
        {state.fieldErrors?.rules ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.rules}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">公告</span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={values.announcement ?? ""}
          name="announcement"
        />
        {state.fieldErrors?.announcement ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.announcement}</p>
        ) : null}
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/72 px-4 py-4">
        <input
          className="h-4 w-4 accent-[var(--color-accent)]"
          defaultChecked={values.allowAnonymous}
          name="allowAnonymous"
          type="checkbox"
        />
        <span className="text-sm text-slate-700">允许圈内匿名发言</span>
      </label>

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <SubmitButton label="保存圈子资料" pendingLabel="保存中..." />
    </form>
  );
}
