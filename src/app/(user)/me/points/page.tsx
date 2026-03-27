import { SurfaceCard } from "@/components/ui/card";
import { pointEventTypeLabel } from "@/modules/operations/lib/constants";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import { getGrowthDashboard } from "@/modules/growth/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "暂无记录";
  }

  return dateFormatter.format(value);
}

export default async function MePointsPage() {
  const user = await requireActiveUser();
  const growth = await getGrowthDashboard(user.id);

  if (!growth) {
    return null;
  }

  return (
    <div className="grid gap-6">
      <SurfaceCard className="grain-panel">
        <p className="eyebrow">我的积分</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">成长先做成可见，再逐步放大激励感。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里会汇总当前积分、等级进度、已获得勋章和最近积分流水。首版先把成长轨迹做清楚，不做兑换和消费体系。
        </p>
      </SurfaceCard>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-slate-500">当前积分</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{growth.user.points}</p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-slate-500">当前等级</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Lv.{growth.level.level}</p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-slate-500">距下一级</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{growth.level.pointsNeeded}</p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-slate-500">已获身份</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{growth.badges.length}</p>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard className="h-fit">
          <p className="eyebrow">等级进度</p>
          <div className="mt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">Lv.{growth.level.level}</p>
                <p className="mt-2 text-sm text-slate-500">
                  当前区间：{growth.level.currentLevelMinPoints} - {growth.level.nextLevelMinPoints}
                </p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>{growth.level.progressPercent}% 进度</p>
                <p className="mt-1">还差 {growth.level.pointsNeeded} 分升级</p>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[rgba(24,32,45,0.08)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#c55e3d,#efc4af)]"
                style={{ width: `${growth.level.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
            <p>精选勋章：{growth.user.featuredBadgeName ?? "暂未设置"}</p>
            <p>当前头衔：{growth.user.titleBadgeName ?? "暂未设置"}</p>
          </div>
        </SurfaceCard>

        <SurfaceCard className="h-fit">
          <p className="eyebrow">已获得身份</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">勋章与头衔</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {growth.badges.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-black/10 bg-white/72 px-5 py-6 text-sm leading-7 text-slate-600 md:col-span-2">
                当前还没有获得勋章或头衔，后续管理员授予后会在这里展示。
              </div>
            ) : (
              growth.badges.map((item) => (
                <div className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5" key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[rgba(23,107,108,0.1)] px-3 py-1 text-xs font-semibold text-[var(--color-teal)]">
                      {item.badge.kind === "TITLE" ? "头衔" : "勋章"}
                    </span>
                    <span className="text-xs text-slate-500">{formatDateTime(item.grantedAt)}</span>
                  </div>
                  <p className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{item.badge.name}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {item.reason ?? item.badge.description ?? "暂无补充说明。"}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    授予人：{item.grantedByDisplayName ?? "系统或管理员"}
                  </p>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-black/8 px-6 py-5">
          <p className="eyebrow">积分流水</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">最近成长记录</h3>
        </div>

        {growth.ledgers.length === 0 ? (
          <div className="px-6 py-6 text-sm leading-7 text-slate-600">
            当前还没有积分流水，后续发帖、评论、获赞和被收藏后会逐步沉淀到这里。
          </div>
        ) : (
          <div className="divide-y divide-black/6">
            {growth.ledgers.map((item) => (
              <div className="grid gap-4 px-6 py-5 md:grid-cols-[180px_120px_minmax(0,1fr)_120px_150px]" key={item.id}>
                <div>
                  <p className="text-base font-semibold text-slate-950">{item.rule?.name ?? pointEventTypeLabel[item.eventType]}</p>
                  <p className="mt-1 text-xs text-slate-500">{pointEventTypeLabel[item.eventType]}</p>
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      item.delta >= 0
                        ? "bg-[rgba(197,94,61,0.1)] text-[var(--color-accent)]"
                        : "bg-[rgba(24,32,45,0.08)] text-slate-700"
                    }`}
                  >
                    {item.delta >= 0 ? "+" : ""}
                    {item.delta}
                  </span>
                </div>
                <div className="text-sm leading-7 text-slate-600">{item.note ?? "暂无备注说明。"}</div>
                <div className="text-sm text-slate-500">余额：{item.balanceAfter}</div>
                <div className="text-sm text-slate-500">{formatDateTime(item.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
