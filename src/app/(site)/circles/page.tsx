import Link from "next/link";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { buildSeoMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import { followCircleAction, unfollowCircleAction } from "@/modules/community/actions";
import {
  listCircleCategories,
  listFollowedCircleIds,
  listPublicCircles
} from "@/modules/community/lib/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "圈子广场",
  description:
    "浏览公开圈子、按分类筛选兴趣方向，并查看圈子申请、关注与圈内沉淀的首版规则。",
  path: "/circles",
  keywords: ["圈子", "兴趣社区", "公开圈子", "社区分类", "圈子关注"]
});

type SearchParams = Promise<{
  q?: string;
  category?: string;
  result?: string;
  message?: string;
}>;

function buildCirclesHref(input: { query?: string; categorySlug?: string }) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }

  if (input.categorySlug) {
    params.set("category", input.categorySlug);
  }

  const search = params.toString();

  return search ? `/circles?${search}` : "/circles";
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
      message: message ?? "你已从关注列表移除这个圈子。"
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

export default async function CirclesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const categorySlug = params.category?.trim() ?? "";
  const [currentUser, categories, circles] = await Promise.all([
    getCurrentUser(),
    listCircleCategories(),
    listPublicCircles({
      query,
      categorySlug,
      take: 18
    })
  ]);
  const activeUser = currentUser?.status === "ACTIVE" ? currentUser : null;
  const followedCircleIds = activeUser
    ? new Set(await listFollowedCircleIds(activeUser.id, circles.map((circle) => circle.id)))
    : new Set<string>();
  const returnTo = buildCirclesHref({ query, categorySlug });
  const feedback = getFeedback(params.result, params.message);
  const applyHref = activeUser ? "/me/circle-applications/new" : "/login?redirectTo=/me/circle-applications/new";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
      <SectionHeading
        aside={
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={applyHref}>申请创建圈子</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              返回首页
            </ButtonLink>
          </div>
        }
        description="圈子是内容沉淀核心。首版先做公开浏览、关注、圈子申请和后台审核，不做圈内准入审批。"
        eyebrow="圈子系统"
        title="先把圈子做成能沉淀内容、也能长出气氛的房间。"
      />

      {feedback ? (
        <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-2 text-sm leading-7">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-6">
          <SurfaceCard className="h-fit">
            <p className="eyebrow">一级分类</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  !categorySlug
                    ? "border-[var(--color-accent)] bg-[rgba(197,94,61,0.12)] text-[var(--color-accent)]"
                    : "border-black/10 bg-white/80 text-slate-700 hover:-translate-y-0.5"
                }`}
                href={buildCirclesHref({ query })}
              >
                全部
              </Link>
              {categories.map((category) => (
                <Link
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    category.slug === categorySlug
                      ? "border-[var(--color-accent)] bg-[rgba(197,94,61,0.12)] text-[var(--color-accent)]"
                      : "border-black/10 bg-white/80 text-slate-700 hover:-translate-y-0.5"
                  }`}
                  href={buildCirclesHref({ query, categorySlug: category.slug })}
                  key={category.id}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="h-fit bg-[linear-gradient(155deg,rgba(255,255,255,0.94),rgba(239,196,175,0.28))]">
            <p className="eyebrow">参与规则</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>所有人都可以浏览圈子，先把兴趣入口放开。</li>
              <li>只有登录且审核通过的用户可以关注圈子、发帖和评论。</li>
              <li>圈子创建要先提交申请，管理员审核通过后才会上线。</li>
              <li>圈主和圈管后续会承接圈内自治与基础治理动作。</li>
            </ul>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard>
            <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]" method="get">
              {categorySlug ? <input name="category" type="hidden" value={categorySlug} /> : null}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">搜索圈子</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                  defaultValue={query}
                  name="q"
                  placeholder="圈子名称、slug、简介"
                  type="search"
                />
              </label>
              <div className="flex items-end gap-3">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
                  type="submit"
                >
                  筛选圈子
                </button>
                <ButtonLink href="/circles" variant="ghost">
                  重置
                </ButtonLink>
              </div>
            </form>
          </SurfaceCard>

          {circles.length === 0 ? (
            <SurfaceCard className="grain-panel">
              <p className="eyebrow">空列表</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前没有匹配到圈子</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                可以换一个关键词，或者直接提交你想创建的新圈子，后续走管理员审核上线。
              </p>
            </SurfaceCard>
          ) : (
            <div className="grid gap-5">
              {circles.map((circle, index) => {
                const accentGradients = [
                  "from-[rgba(239,196,175,0.72)] to-[rgba(255,255,255,0.85)]",
                  "from-[rgba(23,107,108,0.18)] to-[rgba(255,255,255,0.92)]",
                  "from-[rgba(181,138,56,0.2)] to-[rgba(255,255,255,0.92)]"
                ];
                const gradient = accentGradients[index % accentGradients.length];
                const ownerName =
                  circle.owner?.profile?.nickname ?? circle.owner?.username ?? "暂未分配圈主";
                const isFollowing = followedCircleIds.has(circle.id);

                return (
                  <SurfaceCard key={circle.id}>
                    <div className={`rounded-[1.5rem] bg-gradient-to-br ${gradient} p-5`}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-white/78 px-3 py-1 text-xs font-semibold text-slate-700">
                              {circle.category.name}
                            </span>
                            <span className="rounded-full border border-black/8 bg-white/55 px-3 py-1 text-xs font-medium text-slate-600">
                              {circle.allowAnonymous ? "支持匿名" : "实名互动"}
                            </span>
                          </div>
                          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                            {circle.name}
                          </h2>
                          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{circle.intro}</p>
                        </div>

                        <div className="rounded-[1.25rem] border border-black/8 bg-white/76 px-5 py-4 text-right">
                          <p className="text-sm text-slate-500">当前沉淀</p>
                          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                            {circle.followersCount}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">关注 · {circle.postsCount} 帖</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="text-sm leading-7 text-slate-600">
                        <p>圈主：{ownerName}</p>
                        {circle.announcement ? <p>最新公告：{circle.announcement}</p> : <p>当前还没有圈子公告。</p>}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <ButtonLink href={`/circles/${circle.slug}`} variant="secondary">
                          查看详情
                        </ButtonLink>
                        {activeUser ? (
                          <form action={isFollowing ? unfollowCircleAction : followCircleAction}>
                            <input name="slug" type="hidden" value={circle.slug} />
                            <input name="returnTo" type="hidden" value={returnTo} />
                            <button
                              className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                                isFollowing
                                  ? "border border-black/10 bg-white/80 text-slate-900 shadow-[0_16px_35px_rgba(24,32,45,0.08)]"
                                  : "bg-[var(--color-accent)] text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)]"
                              }`}
                              type="submit"
                            >
                              {isFollowing ? "取消关注" : "关注圈子"}
                            </button>
                          </form>
                        ) : (
                          <ButtonLink href="/login?redirectTo=/circles" variant="ghost">
                            登录后关注
                          </ButtonLink>
                        )}
                      </div>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
