"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/modules/auth/components/submit-button";
import { initialActionState } from "@/modules/auth/lib/types";
import { createPostAction, updatePostAction } from "@/modules/posts/actions";
import {
  pollResultVisibilityOptions,
  postTypeOptions,
  type PollResultVisibilityValue,
  type PostTypeValue
} from "@/modules/posts/lib/constants";

type PostEditorValues = {
  circleId: string;
  title: string;
  postType: PostTypeValue;
  content: string;
  globalTags: string;
  circleTags: string;
  isAnonymous: boolean;
  pollQuestion: string;
  pollOptions: string;
  allowMultiple: boolean;
  resultVisibility: PollResultVisibilityValue;
  expiresAt: string;
};

export function PostEditorForm({
  circleName,
  canCreateAnnouncement,
  initialValues,
  mode,
  postId,
  anonymousAvailable
}: {
  circleName: string;
  canCreateAnnouncement: boolean;
  initialValues: PostEditorValues;
  mode: "create" | "edit";
  postId?: string;
  anonymousAvailable: boolean;
}) {
  const [selectedType, setSelectedType] = useState<PostTypeValue>(initialValues.postType);
  const [state, formAction] = useActionState(
    mode === "create" ? createPostAction : updatePostAction,
    initialActionState
  );

  return (
    <form action={formAction} className="space-y-5">
      <input name="circleId" type="hidden" value={initialValues.circleId} />
      {postId ? <input name="postId" type="hidden" value={postId} /> : null}

      <div className="rounded-[1.35rem] border border-black/8 bg-white/72 px-4 py-4 text-sm leading-7 text-slate-600">
        当前发帖圈子：<span className="font-semibold text-slate-900">{circleName}</span>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">帖子类型</span>
        <select
          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={initialValues.postType}
          name="postType"
          onChange={(event) => setSelectedType(event.target.value as PostTypeValue)}
        >
          {postTypeOptions
            .filter((item) => item.value !== "ANNOUNCEMENT" || canCreateAnnouncement)
            .map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
        </select>
        <p className="mt-2 text-xs text-slate-500">
          {
            postTypeOptions.find((item) => item.value === selectedType)?.description
          }
        </p>
        {state.fieldErrors?.postType ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.postType}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">标题</span>
        <input
          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={initialValues.title}
          name="title"
          placeholder="给这篇帖子起一个清晰、具体的标题"
          type="text"
        />
        {state.fieldErrors?.title ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.title}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">正文</span>
        <textarea
          className="mt-2 min-h-72 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={initialValues.content}
          name="content"
          placeholder="先支持文本正文，后续会继续接评论、附件和更完整的互动渲染。"
        />
        {state.fieldErrors?.content ? (
          <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.content}</p>
        ) : null}
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">全站话题标签</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={initialValues.globalTags}
            name="globalTags"
            placeholder="如 热门话题, 新片讨论"
            type="text"
          />
          <p className="mt-2 text-xs text-slate-500">使用逗号分隔，最多 5 个。</p>
          {state.fieldErrors?.globalTags ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.globalTags}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">圈内细分标签</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={initialValues.circleTags}
            name="circleTags"
            placeholder="如 影评, 入坑指南"
            type="text"
          />
          <p className="mt-2 text-xs text-slate-500">用于圈内沉淀更细的内容主题，最多 5 个。</p>
          {state.fieldErrors?.circleTags ? (
            <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.circleTags}</p>
          ) : null}
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/72 px-4 py-4">
        <input
          className="h-4 w-4 accent-[var(--color-accent)]"
          defaultChecked={initialValues.isAnonymous}
          disabled={!anonymousAvailable}
          name="isAnonymous"
          type="checkbox"
        />
        <span className="text-sm text-slate-700">
          {anonymousAvailable ? "以匿名身份发布" : "当前圈子未开启匿名发帖"}
        </span>
      </label>
      {state.fieldErrors?.isAnonymous ? (
        <p className="text-xs text-[var(--color-accent)]">{state.fieldErrors.isAnonymous}</p>
      ) : null}

      {selectedType === "POLL" ? (
        <div className="space-y-5 rounded-[1.5rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-5">
          <div>
            <p className="eyebrow">投票配置</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前先把投票帖结构建好，正式投票动作会在下一步接进来。
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">投票问题</span>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={initialValues.pollQuestion}
              name="pollQuestion"
              placeholder="如 你更想先看到哪类功能？"
              type="text"
            />
            {state.fieldErrors?.pollQuestion ? (
              <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.pollQuestion}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">投票选项</span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={initialValues.pollOptions}
              name="pollOptions"
              placeholder={"每行一个选项\n例如：\n继续补内容互动\n先做搜索和发现"}
            />
            {state.fieldErrors?.pollOptions ? (
              <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.pollOptions}</p>
            ) : null}
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">结果可见方式</span>
              <select
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                defaultValue={initialValues.resultVisibility}
                name="resultVisibility"
              >
                {pollResultVisibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">截止时间</span>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                defaultValue={initialValues.expiresAt}
                name="expiresAt"
                type="datetime-local"
              />
              {state.fieldErrors?.expiresAt ? (
                <p className="mt-2 text-xs text-[var(--color-accent)]">{state.fieldErrors.expiresAt}</p>
              ) : null}
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/72 px-4 py-4">
            <input
              className="h-4 w-4 accent-[var(--color-accent)]"
              defaultChecked={initialValues.allowMultiple}
              name="allowMultiple"
              type="checkbox"
            />
            <span className="text-sm text-slate-700">允许多选</span>
          </label>
        </div>
      ) : null}

      {state.message ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[rgba(197,94,61,0.08)] px-4 py-3 text-sm text-slate-700">
          {state.message}
        </div>
      ) : null}

      <SubmitButton
        label={mode === "create" ? "发布帖子" : "保存帖子"}
        pendingLabel={mode === "create" ? "发布中..." : "保存中..."}
      />
    </form>
  );
}
