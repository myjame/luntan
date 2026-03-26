import Link from "next/link";

import { SurfaceCard } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import { PostFeedCard } from "@/modules/posts/components/post-feed-card";
import { squareSortOptions } from "@/modules/posts/lib/constants";
import { listHotGlobalTags, listSquarePosts } from "@/modules/posts/lib/service";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  sort?: string;
}>;

function resolveSquareSort(value?: string) {
  return squareSortOptions.find((item) => item.value === value)?.value ?? "HOT";
}

function buildSquareHref(sort: string) {
  return sort === "HOT" ? "/square" : `/square?sort=${sort}`;
}

export default async function SquarePage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const [params, currentUser] = await Promise.all([searchParams, getCurrentUser()]);
  const selectedSort = resolveSquareSort(params.sort);
  const [posts, hotTags] = await Promise.all([
    listSquarePosts({
      sort: selectedSort,
      take: 12
    }),
    listHotGlobalTags(10)
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
      <SectionHeading
        description="广场页承接热度排序和最新切换，既要有参与欲望，也要保证列表节奏不显得机械。"
        eyebrow="广场流"
        title="内容流先做清楚，再把热度做聪明。"
      />

      <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <SurfaceCard className="h-fit">
          <p className="eyebrow">流量分发</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">首版建议的广场规则</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
            <li>默认按热度排序，支持切换最新。</li>
            <li>热度先按点赞、评论、收藏、浏览与时间衰减综合计算。</li>
            <li>新用户内容按观察期审核策略决定是否先审后发。</li>
            <li>游客可以浏览，登录且审核通过的用户才可互动。</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            {squareSortOptions.map((option) => (
              <Link
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  option.value === selectedSort
                    ? "border-[var(--color-accent)] bg-[rgba(197,94,61,0.12)] text-[var(--color-accent)]"
                    : "border-black/10 bg-white/80 text-slate-700 hover:-translate-y-0.5"
                }`}
                href={buildSquareHref(option.value)}
                key={option.value}
              >
                {option.label}
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700">热门话题</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {hotTags.length > 0 ? (
                hotTags.map((tag) => (
                  <span
                    className="rounded-full bg-[rgba(23,107,108,0.1)] px-3 py-1 text-xs font-semibold text-[var(--color-teal)]"
                    key={tag.id}
                  >
                    #{tag.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">等帖子积累起来后，这里会出现更稳定的话题热榜。</span>
              )}
            </div>
          </div>
        </SurfaceCard>

        <div className="grid gap-5">
          {posts.length === 0 ? (
            <SurfaceCard className="grain-panel">
              <p className="eyebrow">空广场</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前还没有公开帖子</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                可以先去任意圈子里发布第一篇帖子，广场会自动把它纳入公开内容流。
              </p>
            </SurfaceCard>
          ) : (
            posts.map((post) => (
              <PostFeedCard
                currentUserId={currentUser?.id}
                currentUserRole={currentUser?.role}
                key={post.id}
                post={post}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
