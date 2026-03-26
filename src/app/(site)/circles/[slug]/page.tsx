import Link from "next/link";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import { followCircleAction, unfollowCircleAction } from "@/modules/community/actions";
import { getPublicCircleDetail } from "@/modules/community/lib/service";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric"
});

type PageParams = Promise<{
  slug: string;
}>;

type SearchParams = Promise<{
  result?: string;
  message?: string;
}>;

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "近期";
  }

  return dateFormatter.format(value);
}

function getFeedback(result?: string, message?: string) {
  if (result === "followed") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "关注成功",
      message: message ?? "这个圈子已经进入你的关注列表。"
    };
  }

  if (result === "unfollowed") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "已取消关注",
      message: message ?? "这个圈子已从你的关注列表移除。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "操作未完成",
      message: message ?? "请稍后再试。"
    };
  }

  return null;
}

export default async function CircleDetailPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const [{ slug }, query, currentUser] = await Promise.all([params, searchParams, getCurrentUser()]);
  const activeUser = currentUser?.status === "ACTIVE" ? currentUser : null;
  const detail = await getPublicCircleDetail(slug, activeUser?.id, activeUser?.role);

  if (!detail) {
    notFound();
  }

  const feedback = getFeedback(query.result, query.message);
  const returnTo = `/circles/${detail.circle.slug}`;
  const ownerName =
    detail.circle.owner?.profile?.nickname ?? detail.circle.owner?.username ?? "暂未分配圈主";
  const managerList = detail.circle.managers.filter(
    (item) => item.userId !== detail.circle.ownerId && item.role === "MANAGER"
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(135deg,rgba(255,251,247,0.96),rgba(246,236,226,0.88))] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Link className="text-sm font-medium text-slate-500 transition hover:text-slate-900" href="/circles">
                圈子列表
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-slate-900">{detail.circle.name}</span>
            </div>
            <p className="eyebrow mt-4">{detail.circle.category.name}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{detail.circle.name}</h1>
            <p className="mt-4 text-sm leading-8 text-slate-600">{detail.circle.intro}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/circles" variant="secondary">
              返回圈子列表
            </ButtonLink>
            {detail.canManage ? (
              <ButtonLink href={`/circles/${detail.circle.slug}/manage`}>管理圈子</ButtonLink>
            ) : null}
          </div>
        </div>
      </div>

      {feedback ? (
        <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-2 text-sm leading-7">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-6">
          <SurfaceCard className="grain-panel h-fit">
            <div className="rounded-[1.5rem] bg-[linear-gradient(155deg,rgba(239,196,175,0.42),rgba(255,255,255,0.9))] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                  {detail.circle.category.name}
                </span>
                <span className="rounded-full border border-black/8 bg-white/65 px-3 py-1 text-xs font-medium text-slate-600">
                  {detail.circle.allowAnonymous ? "支持匿名发言" : "圈内实名互动"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-[1.15rem] border border-black/8 bg-white/78 p-4">
                  <p className="text-sm text-slate-500">关注人数</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {detail.circle.followersCount}
                  </p>
                </div>
                <div className="rounded-[1.15rem] border border-black/8 bg-white/78 p-4">
                  <p className="text-sm text-slate-500">帖子数量</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {detail.circle.postsCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {activeUser ? (
                <form action={detail.isFollowing ? unfollowCircleAction : followCircleAction}>
                  <input name="slug" type="hidden" value={detail.circle.slug} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
                    type="submit"
                  >
                    {detail.isFollowing ? "取消关注" : "关注圈子"}
                  </button>
                </form>
              ) : (
                <ButtonLink href={`/login?redirectTo=${encodeURIComponent(returnTo)}`}>登录后关注</ButtonLink>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard className="h-fit">
            <p className="eyebrow">圈子信息</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p>圈主：{ownerName}</p>
              <p>创建时间：{formatDate(detail.circle.createdAt)}</p>
              <p>圈规：{detail.circle.rules ?? "圈规将在圈主管理页维护。"}</p>
              <p>公告：{detail.circle.announcement ?? "当前还没有圈子公告。"}</p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="h-fit">
            <p className="eyebrow">圈内角色</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">圈主</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{ownerName}</p>
              </div>

              {managerList.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/70 px-4 py-4 text-sm text-slate-600">
                  当前还没有额外圈管，后续可以在圈主管理页添加。
                </div>
              ) : (
                managerList.map((manager) => (
                  <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3" key={manager.id}>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">圈管</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {manager.user.profile?.nickname ?? manager.user.username}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard>
            <p className="eyebrow">帖子流入口</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">右栏会继续承接帖子流与互动节奏。</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Step 5 先把圈子浏览、申请、关注和后台审核打通。帖子发布、置顶和删帖会在 Step 6 接进来。
            </p>
          </SurfaceCard>

          {detail.circle.posts.length === 0 ? (
            <SurfaceCard className="grain-panel">
              <p className="eyebrow">帖子占位</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前还没有圈内帖子</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                圈子主流程已经可以先浏览和关注，帖子系统会在下一步把右侧内容流真正填满。
              </p>
            </SurfaceCard>
          ) : (
            detail.circle.posts.map((post) => (
              <SurfaceCard key={post.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-semibold text-slate-900">
                    {post.postType}
                  </span>
                  <span className="text-sm text-slate-500">{formatDate(post.publishedAt ?? post.createdAt)}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{post.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{post.excerpt ?? "当前帖子还没有摘要内容。"}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                  <span>{post.commentCount} 条评论</span>
                  <span>{post.reactionCount} 次互动</span>
                </div>
              </SurfaceCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
