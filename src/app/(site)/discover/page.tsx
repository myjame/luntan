import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { ListCard, SurfaceCard } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { PostFeedCard } from "@/modules/posts/components/post-feed-card";
import { UserFollowCard } from "@/modules/social/components/user-follow-card";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import { getDiscoverPageData } from "@/modules/discovery/lib/service";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const [currentUser, data] = await Promise.all([getCurrentUser(), getDiscoverPageData()]);
  const spotlightItems = [...data.operations.topicSlots, ...data.operations.activitySlots].slice(0, 4);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
      <SectionHeading
        description="发现页适合聚合推荐圈子、热门话题、热门榜和运营活动，让用户在浏览之外快速找到想留下来的理由。"
        eyebrow="发现页"
        title="把“发现效率”做成社区的情绪入口。"
      />

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">热门话题</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                今天的发现页应该像一本会动的兴趣杂志。
              </h2>
            </div>
            <ButtonLink href="/search" variant="secondary">
              去搜索
            </ButtonLink>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {data.hotTags.length > 0 ? (
              data.hotTags.map((tag) => (
                <Link
                  className="rounded-full bg-[rgba(197,94,61,0.1)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:-translate-y-0.5"
                  href={`/search?q=${encodeURIComponent(tag.name)}`}
                  key={tag.id}
                >
                  #{tag.name} · {tag._count.postTags}
                </Link>
              ))
            ) : (
              <span className="text-sm text-slate-500">等帖子积累起来后，这里会出现稳定的热门话题。</span>
            )}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {spotlightItems.length > 0 ? (
              spotlightItems.map((item) => (
                <Link
                  className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5 transition hover:-translate-y-0.5"
                  href={item.linkUrl ?? "/discover"}
                  key={item.id}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                    {item.slotType === "HOMEPAGE_TOPIC" ? "今日话题" : "推荐活动"}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description ?? "把发现页做成更有参与欲望的入口。"}
                  </p>
                </Link>
              ))
            ) : (
              data.latestPosts.slice(0, 4).map((post) => (
                <div className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5" key={post.id}>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                    最新内容
                  </p>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                    {post.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {post.excerpt ?? "这篇帖子暂时还没有摘要。"}
                  </p>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <div className="grid gap-5">
          {data.recommendedCircles.map((circle) => (
            <ListCard
              body={circle.intro ?? "这个圈子暂时还没有填写介绍。"}
              eyebrow={`${circle.category.name} · 推荐圈子`}
              footer={
                <Link className="text-sm font-semibold text-[var(--color-accent)]" href={`/circles/${circle.slug}`}>
                  打开圈子
                </Link>
              }
              key={circle.id}
              title={circle.name}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">热门榜</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">先用真实热度把内容发现效率撑起来。</h2>
            </div>
            <ButtonLink href="/square" variant="ghost">
              去广场
            </ButtonLink>
          </div>
          <div className="mt-6 grid gap-5">
            {data.hotPosts.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-black/10 bg-white/72 px-5 py-6 text-sm leading-7 text-slate-600">
                当前还没有热门内容，等公开帖子积累起来后，这里会自动形成稳定的热榜。
              </div>
            ) : (
              data.hotPosts.map((post) => (
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

        <SurfaceCard>
          <p className="eyebrow">活跃作者</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">人和内容一起构成发现页的吸引力。</h2>
          <div className="mt-6 grid gap-4">
            {data.hotUsers.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-black/10 bg-white/72 px-5 py-6 text-sm leading-7 text-slate-600">
                当前还没有足够多的活跃作者数据。
              </div>
            ) : (
              data.hotUsers.map((user) => <UserFollowCard key={user.id} user={user} />)
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
