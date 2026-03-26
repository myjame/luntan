import Link from "next/link";
import type { Route } from "next";

import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { userQuickLinks } from "@/lib/navigation";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { PostFeedCard } from "@/modules/posts/components/post-feed-card";
import { UserCommentCard } from "@/modules/social/components/user-comment-card";
import { UserFollowCard } from "@/modules/social/components/user-follow-card";
import { getMyDashboardData } from "@/modules/social/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric"
});

function buildInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "暂无记录";
}

export default async function MePage() {
  const user = await requireActiveUser();
  const dashboard = await getMyDashboardData(user.id);

  if (!dashboard) {
    return null;
  }

  const stats = [
    { label: "积分", value: dashboard.user.points.toString() },
    { label: "关注", value: dashboard.stats.followingCount.toString() },
    { label: "粉丝", value: dashboard.stats.followersCount.toString() },
    { label: "收藏", value: dashboard.stats.favoriteCount.toString() }
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <div className="space-y-6">
        <SurfaceCard className="h-fit">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-[linear-gradient(135deg,#c55e3d,#efc4af)] text-2xl font-bold text-white">
              {buildInitials(dashboard.user.displayName)}
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-slate-950">
                {dashboard.user.displayName}
              </p>
              <p className="mt-1 text-sm text-slate-500">@{dashboard.user.username}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {dashboard.user.bio ?? "还没有填写个人简介，可以在账号设置里补充自己的兴趣和长期关注方向。"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold">
            {dashboard.user.featuredBadgeName ? (
              <span className="rounded-full bg-[rgba(197,94,61,0.1)] px-3 py-1 text-[var(--color-accent)]">
                勋章：{dashboard.user.featuredBadgeName}
              </span>
            ) : null}
            {dashboard.user.titleBadgeName ? (
              <span className="rounded-full bg-[rgba(23,107,108,0.1)] px-3 py-1 text-[var(--color-teal)]">
                头衔：{dashboard.user.titleBadgeName}
              </span>
            ) : null}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div className="rounded-[1.25rem] border border-black/8 bg-white/80 p-4" key={stat.label}>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 text-sm leading-7 text-slate-600">
            <p>最近活跃：{formatDate(dashboard.user.lastActiveAt)}</p>
            <p>加入社区：{formatDate(dashboard.user.joinedAt)}</p>
            <p>已发布帖子：{dashboard.stats.postCount}</p>
            <p>已发布评论：{dashboard.stats.commentCount}</p>
          </div>

          <div className="mt-6">
            <ButtonLink href={`/users/${dashboard.user.username}`} variant="secondary">
              查看公开主页
            </ButtonLink>
          </div>
        </SurfaceCard>

        <SurfaceCard className="h-fit bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(239,196,175,0.28))]">
          <p className="eyebrow">我的关系</p>
          <div className="mt-5 space-y-4">
            {dashboard.followingUsers.length === 0 && dashboard.followerUsers.length === 0 ? (
              <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                还没有建立用户关注关系，后续可以从作者主页或粉丝列表里继续扩展社交网络。
              </div>
            ) : (
              <>
                {dashboard.followingUsers.slice(0, 2).map((followedUser) => (
                  <UserFollowCard key={`following-${followedUser.id}`} user={followedUser} />
                ))}
                {dashboard.followerUsers.slice(0, 2).map((follower) => (
                  <UserFollowCard key={`follower-${follower.id}`} user={follower} />
                ))}
              </>
            )}
          </div>
          <div className="mt-5">
            <ButtonLink href="/me/follows" variant="ghost">
              查看完整关注与粉丝列表
            </ButtonLink>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6">
        <SurfaceCard>
          <p className="eyebrow">我的模块</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {userQuickLinks.map((item) => (
              <Link
                className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5 transition hover:-translate-y-0.5"
                href={item.href as Route}
                key={item.label}
              >
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">{item.label}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </Link>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">最近帖子</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                你的内容沉淀会从这里继续长出来。
              </h2>
            </div>
            <ButtonLink href="/me/posts" variant="ghost">
              查看全部帖子
            </ButtonLink>
          </div>
          <div className="mt-6 grid gap-4">
            {dashboard.recentPosts.length === 0 ? (
              <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                你还没有发布任何帖子，可以先去圈子里发出第一篇内容。
              </div>
            ) : (
              dashboard.recentPosts.map((post) => (
                <PostFeedCard
                  compact
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  key={post.id}
                  post={post}
                />
              ))
            )}
          </div>
        </SurfaceCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">最近评论</p>
              <ButtonLink href="/me/comments" variant="ghost">
                查看全部评论
              </ButtonLink>
            </div>
            <div className="mt-6 grid gap-4">
              {dashboard.recentComments.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                  你还没有留下评论记录。
                </div>
              ) : (
                dashboard.recentComments.map((comment) => (
                  <UserCommentCard
                    comment={comment}
                    key={comment.id}
                    showAnonymousHint
                  />
                ))
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">最近收藏</p>
              <ButtonLink href="/me/favorites" variant="ghost">
                查看全部收藏
              </ButtonLink>
            </div>
            <div className="mt-6 grid gap-4">
              {dashboard.recentFavorites.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                  还没有收藏任何帖子，之后可以把想回看的内容沉淀在这里。
                </div>
              ) : (
                dashboard.recentFavorites.map((post) => (
                  <PostFeedCard
                    compact
                    currentUserId={user.id}
                    currentUserRole={user.role}
                    key={post.id}
                    post={post}
                  />
                ))
              )}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
