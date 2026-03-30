import Link from "next/link";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { buildSeoMetadata } from "@/lib/metadata";
import { PostFeedCard } from "@/modules/posts/components/post-feed-card";
import { UserFollowCard } from "@/modules/social/components/user-follow-card";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import { getDiscoverPageData, searchCommunity } from "@/modules/discovery/lib/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...buildSeoMetadata({
    title: "社区搜索",
    description: "搜索帖子、圈子和用户，快速找到想看的内容与想加入的社区关系。",
    path: "/search",
    keywords: ["社区搜索", "帖子搜索", "圈子搜索", "用户搜索"]
  }),
  robots: {
    index: false,
    follow: false
  }
};

type SearchParams = Promise<{
  q?: string;
}>;

export default async function SearchPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const [params, currentUser] = await Promise.all([searchParams, getCurrentUser()]);
  const query = params.q?.trim() ?? "";
  const [results, discover] = await Promise.all([
    searchCommunity(query),
    getDiscoverPageData()
  ]);
  const hasQuery = query.length > 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
      <SectionHeading
        description="首版支持帖子、圈子和用户三类搜索，先把内容入口和关系入口收进一个统一搜索页。"
        eyebrow="社区搜索"
        title="先找到想看的内容，再决定要不要留下来。"
      />

      <SurfaceCard className="grain-panel">
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]" method="get">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">搜索帖子、圈子、用户</span>
            <input
              className="mt-2 w-full rounded-[1.4rem] border border-black/10 bg-white/80 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={query}
              name="q"
              placeholder="例如：观影、夜航游戏厅、某个用户名"
              type="search"
            />
          </label>
          <div className="flex items-end gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
              type="submit"
            >
              开始搜索
            </button>
            <ButtonLink href="/search" variant="ghost">
              清空
            </ButtonLink>
          </div>
        </form>
      </SurfaceCard>

      {!hasQuery ? (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <SurfaceCard>
            <p className="eyebrow">搜索建议</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">不知道搜什么时，可以先从热门话题切入。</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {discover.hotTags.length > 0 ? (
                discover.hotTags.map((tag) => (
                  <Link
                    className="rounded-full bg-[rgba(197,94,61,0.1)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:-translate-y-0.5"
                    href={`/search?q=${encodeURIComponent(tag.name)}`}
                    key={tag.id}
                  >
                    #{tag.name}
                  </Link>
                ))
              ) : (
                <span className="text-sm text-slate-500">等帖子积累起来后，这里会出现更稳定的话题搜索建议。</span>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <p className="eyebrow">热门内容</p>
            <div className="mt-5 space-y-3">
              {discover.hotPosts.slice(0, 3).map((post) => (
                <Link
                  className="block rounded-[1.25rem] border border-black/8 bg-white/80 px-4 py-4 transition hover:-translate-y-0.5"
                  href={`/posts/${post.id}`}
                  key={post.id}
                >
                  <p className="text-lg font-semibold tracking-tight text-slate-950">{post.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{post.excerpt ?? "这篇帖子暂时还没有摘要。"}</p>
                </Link>
              ))}
            </div>
          </SurfaceCard>
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-3">
            <SurfaceCard>
              <p className="text-sm text-slate-500">帖子结果</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{results.posts.length}</p>
            </SurfaceCard>
            <SurfaceCard>
              <p className="text-sm text-slate-500">圈子结果</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{results.circles.length}</p>
            </SurfaceCard>
            <SurfaceCard>
              <p className="text-sm text-slate-500">用户结果</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{results.users.length}</p>
            </SurfaceCard>
          </div>

          <SurfaceCard>
            <p className="eyebrow">搜索结果</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">“{query}” 的匹配内容</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              当前先按帖子、圈子、用户三类返回结果；后续如果内容量继续上涨，再补更细的筛选和分页。
            </p>
          </SurfaceCard>

          <div className="space-y-6">
            <SurfaceCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">帖子</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">匹配到的帖子</h3>
                </div>
                <span className="rounded-full border border-black/8 bg-white/76 px-3 py-1 text-xs font-semibold text-slate-700">
                  {results.posts.length} 条
                </span>
              </div>
              <div className="mt-6 grid gap-5">
                {results.posts.length === 0 ? (
                  <div className="rounded-[1.25rem] border border-dashed border-black/10 bg-white/72 px-5 py-6 text-sm leading-7 text-slate-600">
                    当前没有匹配到帖子，可以换一个关键词，或者先去圈子和用户结果里继续探索。
                  </div>
                ) : (
                  results.posts.map((post) => (
                    <PostFeedCard
                      currentUserId={currentUser?.id}
                      currentUserRole={currentUser?.role}
                      key={post.id}
                      post={post}
                    />
                  ))
                )}
              </div>
            </SurfaceCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <SurfaceCard>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">圈子</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">匹配到的圈子</h3>
                  </div>
                  <span className="rounded-full border border-black/8 bg-white/76 px-3 py-1 text-xs font-semibold text-slate-700">
                    {results.circles.length} 条
                  </span>
                </div>
                <div className="mt-6 grid gap-4">
                  {results.circles.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-dashed border-black/10 bg-white/72 px-5 py-6 text-sm leading-7 text-slate-600">
                      当前没有匹配到圈子。
                    </div>
                  ) : (
                    results.circles.map((circle) => (
                      <Link
                        className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5 transition hover:-translate-y-0.5"
                        href={`/circles/${circle.slug}`}
                        key={circle.id}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="rounded-full bg-[rgba(23,107,108,0.1)] px-3 py-1 text-xs font-semibold text-[var(--color-teal)]">
                            {circle.category.name}
                          </span>
                          <span className="text-sm text-slate-500">{circle.followersCount} 关注</span>
                        </div>
                        <h4 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{circle.name}</h4>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{circle.intro ?? "这个圈子暂时还没有填写介绍。"}</p>
                      </Link>
                    ))
                  )}
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">用户</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">匹配到的用户</h3>
                  </div>
                  <span className="rounded-full border border-black/8 bg-white/76 px-3 py-1 text-xs font-semibold text-slate-700">
                    {results.users.length} 条
                  </span>
                </div>
                <div className="mt-6 grid gap-4">
                  {results.users.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-dashed border-black/10 bg-white/72 px-5 py-6 text-sm leading-7 text-slate-600">
                      当前没有匹配到用户。
                    </div>
                  ) : (
                    results.users.map((user) => <UserFollowCard key={user.id} user={user} />)
                  )}
                </div>
              </SurfaceCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
