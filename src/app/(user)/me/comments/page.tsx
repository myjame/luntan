import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { UserCommentCard } from "@/modules/social/components/user-comment-card";
import { listUserComments } from "@/modules/social/lib/service";

export default async function MyCommentsPage() {
  const user = await requireActiveUser();
  const comments = await listUserComments({
    userId: user.id,
    includeAnonymous: true,
    take: 24
  });

  return (
    <div className="grid gap-6">
      <SurfaceCard>
        <p className="eyebrow">我的评论</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          回看自己的观点、回复和互动痕迹。
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          匿名评论会明确标记为“仅你可见”，不会暴露在公开用户主页中。
        </p>
      </SurfaceCard>

      <div className="grid gap-5">
        {comments.length === 0 ? (
          <SurfaceCard className="grain-panel">
            <p className="eyebrow">还没有评论</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              你还没有留下评论记录，之后在帖子详情页里互动后会汇总到这里。
            </p>
          </SurfaceCard>
        ) : (
          comments.map((comment) => (
            <UserCommentCard comment={comment} key={comment.id} showAnonymousHint />
          ))
        )}
      </div>
    </div>
  );
}
