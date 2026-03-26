import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { PostFeedCard } from "@/modules/posts/components/post-feed-card";
import { listPostsByAuthorId } from "@/modules/posts/lib/service";

export default async function MyPostsPage() {
  const user = await requireActiveUser();
  const posts = await listPostsByAuthorId({
    authorId: user.id,
    includeAnonymous: true,
    take: 24
  });

  return (
    <div className="grid gap-6">
      <SurfaceCard>
        <p className="eyebrow">我的帖子</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          这里汇总了你已经发布的全部帖子。
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          匿名发布的帖子也会在这里展示，但不会自动出现在公开用户主页中。
        </p>
      </SurfaceCard>

      <div className="grid gap-5">
        {posts.length === 0 ? (
          <SurfaceCard className="grain-panel">
            <p className="eyebrow">还没有内容</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              你还没有发布任何帖子，可以先去圈子里发出第一篇内容。
            </p>
            <div className="mt-5">
              <ButtonLink href="/circles">去圈子里发帖</ButtonLink>
            </div>
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
