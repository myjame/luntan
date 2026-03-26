import Link from "next/link";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { PostEditorForm } from "@/modules/posts/components/post-editor-form";
import { getPostComposerContext } from "@/modules/posts/lib/service";

export const dynamic = "force-dynamic";

type PageParams = Promise<{
  slug: string;
}>;

export default async function NewPostPage({
  params
}: {
  params: PageParams;
}) {
  const [{ slug }, user] = await Promise.all([params, requireActiveUser()]);
  const context = await getPostComposerContext({
    slug,
    actorId: user.id,
    actorRole: user.role
  });

  if (!context) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(135deg,rgba(255,251,247,0.96),rgba(246,236,226,0.88))] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
                href={`/circles/${context.circle.slug}`}
              >
                {context.circle.name}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-slate-900">发布帖子</span>
            </div>
            <p className="eyebrow mt-4">圈子发帖</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              让圈子先长出内容流，再把互动和治理慢慢做厚。
            </h1>
            <p className="mt-4 text-sm leading-8 text-slate-600">
              当前支持讨论帖、提问帖、经验帖、公告帖和投票帖，也支持帖子图片、GIF 展示与文档附件上传。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/circles/${context.circle.slug}`} variant="secondary">
              返回圈子
            </ButtonLink>
            {context.canCreateAnnouncement ? (
              <ButtonLink href={`/circles/${context.circle.slug}/manage`} variant="ghost">
                圈主管理
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_340px]">
        <SurfaceCard>
          <p className="eyebrow">内容编辑器</p>
          <div className="mt-6">
            <PostEditorForm
              anonymousAvailable={context.circle.allowAnonymous}
              canCreateAnnouncement={context.canCreateAnnouncement}
              circleName={context.circle.name}
              initialValues={{
                circleId: context.circle.id,
                title: "",
                postType: "DISCUSSION",
                content: "",
                mediaUrls: "",
                globalTags: "",
                circleTags: "",
                isAnonymous: false,
                pollQuestion: "",
                pollOptions: "",
                allowMultiple: false,
                resultVisibility: "ALWAYS_PUBLIC",
                expiresAt: "",
                attachments: []
              }}
              mode="create"
            />
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="h-fit">
            <p className="eyebrow">当前圈子</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {context.circle.name}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {context.circle.intro ?? "这个圈子正在等待第一批优质帖子把氛围做起来。"}
            </p>
            <div className="mt-4 text-sm leading-7 text-slate-500">
              <p>分类：{context.circle.category.name}</p>
              <p>{context.circle.allowAnonymous ? "已开启匿名发帖" : "匿名发帖关闭"}</p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="h-fit bg-[linear-gradient(155deg,rgba(255,255,255,0.94),rgba(23,107,108,0.08))]">
            <p className="eyebrow">发布建议</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>标题尽量把观点或问题说完整，避免只有情绪词。</li>
              <li>正文先把上下文讲清楚，后续评论区才更容易接得住。</li>
              <li>全站标签更偏发现入口，圈内标签更偏沉淀和整理。</li>
            </ul>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
