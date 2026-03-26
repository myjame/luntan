import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { UserFollowCard } from "@/modules/social/components/user-follow-card";
import { followUserAction, unfollowUserAction } from "@/modules/social/actions";
import { listUserFollowCards } from "@/modules/social/lib/service";

export default async function MyFollowsPage() {
  const user = await requireActiveUser();
  const [followingUsers, followerUsers] = await Promise.all([
    listUserFollowCards({
      userId: user.id,
      type: "following",
      take: 24
    }),
    listUserFollowCards({
      userId: user.id,
      type: "followers",
      take: 24
    })
  ]);
  const followingUsernameSet = new Set(followingUsers.map((item) => item.username));

  return (
    <div className="grid gap-6">
      <SurfaceCard>
        <p className="eyebrow">关注与粉丝</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          关系管理从这里展开。
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          你可以在这里查看自己关注的人，也可以直接回关粉丝或取消已有关注。
        </p>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard>
          <p className="eyebrow">我关注的人</p>
          <div className="mt-6 grid gap-4">
            {followingUsers.length === 0 ? (
              <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                你还没有关注任何用户，可以从帖子作者主页开始建立第一批关系。
              </div>
            ) : (
              followingUsers.map((followedUser) => (
                <UserFollowCard
                  action={
                    <form action={unfollowUserAction}>
                      <input name="username" type="hidden" value={followedUser.username} />
                      <input name="returnTo" type="hidden" value="/me/follows" />
                      <Button type="submit" variant="ghost">
                        取消关注
                      </Button>
                    </form>
                  }
                  key={followedUser.id}
                  user={followedUser}
                />
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="eyebrow">关注我的人</p>
          <div className="mt-6 grid gap-4">
            {followerUsers.length === 0 ? (
              <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                暂时还没有粉丝，后续随着发帖和互动增加，这里会逐步形成关系网络。
              </div>
            ) : (
              followerUsers.map((follower) => {
                const isFollowing = followingUsernameSet.has(follower.username);

                return (
                  <UserFollowCard
                    action={
                      <form action={isFollowing ? unfollowUserAction : followUserAction}>
                        <input name="username" type="hidden" value={follower.username} />
                        <input name="returnTo" type="hidden" value="/me/follows" />
                        <Button type="submit" variant={isFollowing ? "ghost" : "secondary"}>
                          {isFollowing ? "取消关注" : "回关"}
                        </Button>
                      </form>
                    }
                    key={follower.id}
                    user={follower}
                  />
                );
              })
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
