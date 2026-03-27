import { notFound } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import { resolveGrowthLevel } from "@/modules/growth/lib/service";
import { ReportForm } from "@/modules/moderation/components/report-form";
import { PostFeedCard } from "@/modules/posts/components/post-feed-card";
import { UserCommentCard } from "@/modules/social/components/user-comment-card";
import {
  blockUserAction,
  followUserAction,
  unblockUserAction,
  unfollowUserAction
} from "@/modules/social/actions";
import { getPublicUserProfile } from "@/modules/social/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric"
});

type PageParams = Promise<{
  username: string;
}>;

type SearchParams = Promise<{
  result?: string;
  message?: string;
}>;

function buildInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "暂无记录";
}

function getFeedback(result?: string, message?: string) {
  if (result === "user-followed") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "关注成功",
      message: message ?? "你们的关注关系已经建立。"
    };
  }

  if (result === "user-unfollowed") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "已取消关注",
      message: message ?? "这条关注关系已经解除。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "操作未完成",
      message: message ?? "请稍后再试。"
    };
  }

  if (result === "reported") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "举报已提交",
      message: message ?? "管理员会尽快处理这条举报。"
    };
  }

  if (result === "user-blocked") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "已屏蔽用户",
      message: message ?? "你将不再与这个用户建立关注或私信互动。"
    };
  }

  if (result === "user-unblocked") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "已取消屏蔽",
      message: message ?? "你可以重新决定是否关注或私信对方。"
    };
  }

  return null;
}

export const dynamic = "force-dynamic";

export default async function PublicUserPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const [{ username }, query, currentUser] = await Promise.all([
    params,
    searchParams,
    getCurrentUser()
  ]);
  const activeUser = currentUser?.status === "ACTIVE" ? currentUser : null;
  const profile = await getPublicUserProfile(username, activeUser?.id);

  if (!profile) {
    notFound();
  }

  const feedback = getFeedback(query.result, query.message);
  const returnTo = `/users/${profile.user.username}`;
  const level = resolveGrowthLevel(profile.user.points);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(135deg,rgba(255,251,247,0.96),rgba(246,236,226,0.88))] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#c55e3d,#efc4af)] text-3xl font-bold text-white">
              {buildInitials(profile.user.displayName)}
            </div>
            <div className="max-w-3xl">
              <p className="eyebrow">公开用户主页</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {profile.user.displayName}
              </h1>
              <p className="mt-2 text-sm text-slate-500">@{profile.user.username}</p>
              <p className="mt-4 text-sm leading-8 text-slate-600">
                {profile.user.bio ?? "这个用户还没有填写个人简介。"}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
                {profile.user.featuredBadgeName ? (
                  <span className="rounded-full bg-[rgba(197,94,61,0.1)] px-3 py-1 text-[var(--color-accent)]">
                    勋章：{profile.user.featuredBadgeName}
                  </span>
                ) : null}
                {profile.user.titleBadgeName ? (
                  <span className="rounded-full bg-[rgba(23,107,108,0.1)] px-3 py-1 text-[var(--color-teal)]">
                    头衔：{profile.user.titleBadgeName}
                  </span>
                ) : null}
                {profile.relation.isMutual ? (
                  <span className="rounded-full bg-[rgba(24,32,45,0.08)] px-3 py-1 text-slate-800">
                    已互关
                  </span>
                ) : profile.relation.followsViewer ? (
                  <span className="rounded-full bg-[rgba(23,107,108,0.1)] px-3 py-1 text-[var(--color-teal)]">
                    对方关注了你
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {activeUser?.username === profile.user.username ? (
              <ButtonLink href="/me" variant="secondary">
                回到我的主页
              </ButtonLink>
            ) : (
              <>
                {activeUser && profile.relation.blockedByViewer ? (
                  <>
                    <form action={unblockUserAction}>
                      <input name="username" type="hidden" value={profile.user.username} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <Button type="submit" variant="secondary">
                        取消屏蔽
                      </Button>
                    </form>
                    <span className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-4 py-3 text-sm text-slate-600">
                      你已屏蔽该用户，关注和私信入口已关闭。
                    </span>
                  </>
                ) : activeUser && profile.relation.blockedViewer ? (
                  <span className="inline-flex items-center rounded-full border border-black/8 bg-white/72 px-4 py-3 text-sm text-slate-600">
                    对方已屏蔽你，当前无法关注或私信。
                  </span>
                ) : activeUser && profile.relation.canFollow ? (
                  <>
                    <ButtonLink href={`/me/messages?to=${profile.user.username}`} variant="secondary">
                      发私信
                    </ButtonLink>
                    <form action={profile.relation.isFollowing ? unfollowUserAction : followUserAction}>
                      <input name="username" type="hidden" value={profile.user.username} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <Button type="submit" variant={profile.relation.isFollowing ? "ghost" : "primary"}>
                        {profile.relation.isFollowing ? "取消关注" : "关注对方"}
                      </Button>
                    </form>
                    <form action={blockUserAction}>
                      <input name="username" type="hidden" value={profile.user.username} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <Button type="submit" variant="ghost">
                        屏蔽用户
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <ButtonLink href={`/login?redirectTo=${encodeURIComponent(`/me/messages?to=${profile.user.username}`)}`} variant="secondary">
                      登录后私信
                    </ButtonLink>
                    <ButtonLink href={`/login?redirectTo=${encodeURIComponent(returnTo)}`}>
                      登录后关注
                    </ButtonLink>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {feedback ? (
        <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-2 text-sm leading-7">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.62fr_1.38fr]">
        <div className="space-y-6">
          <SurfaceCard className="h-fit">
            <p className="eyebrow">基础信息</p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>积分：{profile.user.points}</p>
              <p>等级：Lv.{level.level}</p>
              <p>关注：{profile.stats.followingCount}</p>
              <p>粉丝：{profile.stats.followersCount}</p>
              <p>公开帖子：{profile.stats.postCount}</p>
              <p>公开评论：{profile.stats.commentCount}</p>
              <p>公开收藏：{profile.stats.favoriteCount}</p>
              <p>最近活跃：{formatDate(profile.user.lastActiveAt)}</p>
              <p>加入社区：{formatDate(profile.user.joinedAt)}</p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="h-fit bg-[linear-gradient(150deg,rgba(255,255,255,0.94),rgba(23,107,108,0.08))]">
            <p className="eyebrow">主页说明</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>这里展示的是公开可见的帖子、评论和收藏。</li>
              <li>匿名发言不会被汇总到公开用户主页里。</li>
              <li>想看自己的全部匿名内容，可以进入“我的主页”。</li>
            </ul>
          </SurfaceCard>

          {activeUser && activeUser.username !== profile.user.username ? (
            <SurfaceCard className="h-fit">
              <p className="eyebrow">治理入口</p>
              <div className="mt-5">
                <ReportForm
                  defaultOpen={query.result === "reported"}
                  description="如果该账号存在骚扰、辱骂、广告或违规行为，可以直接提交举报。"
                  returnTo={returnTo}
                  summaryLabel="举报这个用户"
                  targetId={profile.user.id}
                  targetType="USER"
                />
              </div>
            </SurfaceCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">最近帖子</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  公开发言会优先沉淀在这里。
                </h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {profile.recentPosts.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                  这个用户还没有公开展示的帖子内容。
                </div>
              ) : (
                profile.recentPosts.map((post) => (
                  <PostFeedCard
                    compact
                    currentUserId={activeUser?.id}
                    currentUserRole={activeUser?.role}
                    key={post.id}
                    post={post}
                    showCircle
                  />
                ))
              )}
            </div>
          </SurfaceCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <SurfaceCard>
              <p className="eyebrow">最近评论</p>
              <div className="mt-6 grid gap-4">
                {profile.recentComments.length === 0 ? (
                  <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                    这个用户还没有公开展示的评论。
                  </div>
                ) : (
                  profile.recentComments.map((comment) => (
                    <UserCommentCard comment={comment} key={comment.id} />
                  ))
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <p className="eyebrow">收藏内容</p>
              <div className="mt-6 grid gap-4">
                {profile.recentFavorites.length === 0 ? (
                  <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                    这个用户暂时没有公开展示的收藏内容。
                  </div>
                ) : (
                  profile.recentFavorites.map((post) => (
                    <PostFeedCard
                      compact
                      currentUserId={activeUser?.id}
                      currentUserRole={activeUser?.role}
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
    </div>
  );
}
