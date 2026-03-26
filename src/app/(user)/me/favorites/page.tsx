import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { PostFeedCard } from "@/modules/posts/components/post-feed-card";
import { listFavoritePostsByUserId } from "@/modules/posts/lib/service";

export default async function MyFavoritesPage() {
  const user = await requireActiveUser();
  const posts = await listFavoritePostsByUserId({
    userId: user.id,
    take: 24
  });

  return (
    <div className="grid gap-6">
      <SurfaceCard>
        <p className="eyebrow">我的收藏</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          想回看的内容会持续沉淀在这里。
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          收藏动作和帖子详情页联动，取消收藏后列表会立即同步。
        </p>
      </SurfaceCard>

      <div className="grid gap-5">
        {posts.length === 0 ? (
          <SurfaceCard className="grain-panel">
            <p className="eyebrow">还没有收藏</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              你还没有收藏任何帖子，之后在帖子详情页点一下收藏，这里就会开始累计。
            </p>
          </SurfaceCard>
        ) : (
          posts.map((post) => (
            <PostFeedCard
              currentUserId={user.id}
              currentUserRole={user.role}
              key={post.id}
              post={post}
            />
          ))
        )}
      </div>
    </div>
  );
}
