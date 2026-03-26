import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { deletePostAction } from "@/modules/posts/actions";
import { PostEditorForm } from "@/modules/posts/components/post-editor-form";
import { getEditablePostById } from "@/modules/posts/lib/service";

export const dynamic = "force-dynamic";

type PageParams = Promise<{
  postId: string;
}>;

export default async function EditPostPage({
  params
}: {
  params: PageParams;
}) {
  const [{ postId }, user] = await Promise.all([params, requireActiveUser()]);
  const editor = await getEditablePostById({
    postId,
    actorId: user.id,
    actorRole: user.role
  });

  if (!editor) {
    notFound();
  }

  if (editor.post.circleSlug.trim().length === 0) {
    redirect(`/posts/${postId}`);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(135deg,rgba(255,251,247,0.96),rgba(246,236,226,0.88))] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
                href={`/posts/${editor.post.id}`}
              >
                帖子详情
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-slate-900">编辑帖子</span>
            </div>
            <p className="eyebrow mt-4">作者编辑</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              保留编辑历史，但不打断内容继续流动。
            </h1>
            <p className="mt-4 text-sm leading-8 text-slate-600">
              按需求文档约定，帖子编辑后不重新进入审核。系统会自动保留一次编辑前的历史版本。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/posts/${editor.post.id}`} variant="secondary">
              返回帖子详情
            </ButtonLink>
            <ButtonLink href={`/circles/${editor.post.circleSlug}`} variant="ghost">
              返回圈子
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_340px]">
        <SurfaceCard>
          <p className="eyebrow">编辑表单</p>
          <div className="mt-6">
            <PostEditorForm
              anonymousAvailable={editor.anonymousAvailable}
              canCreateAnnouncement={editor.canCreateAnnouncement}
              circleName={editor.post.circleName}
              initialValues={{
                circleId: editor.post.circleId,
                title: editor.post.title,
                postType: editor.post.postType,
                content: editor.post.content,
                globalTags: editor.post.globalTags,
                circleTags: editor.post.circleTags,
                isAnonymous: editor.post.isAnonymous,
                pollQuestion: editor.post.pollQuestion,
                pollOptions: editor.post.pollOptions,
                allowMultiple: editor.post.allowMultiple,
                resultVisibility: editor.post.resultVisibility,
                expiresAt: editor.post.expiresAt
              }}
              mode="edit"
              postId={editor.post.id}
            />
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="h-fit">
            <p className="eyebrow">当前归属</p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>圈子：{editor.post.circleName}</p>
              <p>分类：{editor.post.categoryName}</p>
              <p>帖子类型：{editor.post.postType}</p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="h-fit">
            <p className="eyebrow">危险操作</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              删除会执行软删除，帖子会从公开列表中移除，但历史记录仍保留在数据库中。
            </p>
            <div className="mt-5">
              <form action={deletePostAction}>
                <input name="postId" type="hidden" value={editor.post.id} />
                <input name="returnTo" type="hidden" value={`/circles/${editor.post.circleSlug}`} />
                <Button type="submit" variant="ghost">
                  删除这篇帖子
                </Button>
              </form>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
