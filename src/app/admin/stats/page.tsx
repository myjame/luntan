import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import { getStatsOverview } from "@/modules/operations/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric"
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function formatDate(value: Date) {
  return dateFormatter.format(value);
}

function formatDateTime(value: Date) {
  return dateTimeFormatter.format(value);
}

export default async function AdminStatsPage() {
  const data = await getStatsOverview();

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "轻量统计" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 轻量统计</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">先把基础面板立起来，后面再上更复杂的分析看板。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          当前页面汇总近 7 天的 `daily_stats` 数据，并叠加用户、圈子、帖子、评论和举报的实时总量。首版先做轻量读数，不急着引入复杂图表。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/operations">查看运营位</ButtonLink>
          <ButtonLink href="/admin/points" variant="secondary">
            查看积分规则
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="7 天" label="新增用户" value={String(data.recentSummary.newUsers)} />
        <MetricCard accent="7 天" label="新增帖子" value={String(data.recentSummary.newPosts)} />
        <MetricCard accent="7 天" label="新增评论" value={String(data.recentSummary.newComments)} />
        <MetricCard accent="峰值" label="活跃用户峰值" value={String(data.recentSummary.activeUsersPeak)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <SurfaceCard className="grain-panel">
          <p className="eyebrow">实时概览</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前线上基础盘子</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-black/8 bg-white/82 p-4">
              <p className="text-sm text-slate-500">总用户</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.liveSummary.totalUsers}</p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-white/82 p-4">
              <p className="text-sm text-slate-500">活跃用户</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.liveSummary.activeUsers}</p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-white/82 p-4">
              <p className="text-sm text-slate-500">活跃圈子</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.liveSummary.activeCircles}</p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-white/82 p-4">
              <p className="text-sm text-slate-500">待处理举报</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.liveSummary.pendingReports}</p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-white/82 p-4">
              <p className="text-sm text-slate-500">已发布帖子</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.liveSummary.publishedPosts}</p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-white/82 p-4">
              <p className="text-sm text-slate-500">已发布评论</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.liveSummary.publishedComments}</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="grain-panel">
          <p className="eyebrow">7 天补充读数</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">风险与内容节奏</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.3rem] border border-black/8 bg-white/82 p-4">
              <p className="text-sm text-slate-500">近 7 天新增举报</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.recentSummary.newReports}</p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-white/82 p-4">
              <p className="text-sm text-slate-500">统计行数</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.dailyStats.length}</p>
            </div>
            <div className="rounded-[1.3rem] border border-black/8 bg-white/82 p-4 sm:col-span-2">
              <p className="text-sm text-slate-500">当前状态</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {data.dailyStats.length > 0
                  ? `已读取最近 ${data.dailyStats.length} 天 daily_stats，可继续在此基础上补图表和趋势对比。`
                  : "当前还没有 daily_stats 数据，页面会先展示实时总量；后续补充定时聚合后，这里会自动出现趋势行。"}
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-black/8 px-6 py-5">
          <p className="eyebrow">每日统计</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">最近 14 天 daily_stats</h3>
        </div>

        {data.dailyStats.length === 0 ? (
          <div className="px-6 py-6 text-sm leading-7 text-slate-600">
            当前还没有统计快照数据，可以先补定时写入逻辑或通过种子数据验证页面展示。
          </div>
        ) : (
          <div className="divide-y divide-black/6">
            {data.dailyStats.map((item) => (
              <div className="grid gap-4 px-6 py-5 md:grid-cols-[160px_repeat(5,minmax(0,1fr))_180px]" key={item.id}>
                <div>
                  <p className="text-base font-semibold text-slate-950">{formatDate(item.statDate)}</p>
                  <p className="mt-1 text-xs text-slate-500">更新于 {formatDateTime(item.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">新增用户</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{item.newUsers}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">新增帖子</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{item.newPosts}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">新增评论</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{item.newComments}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">新增举报</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{item.newReports}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">活跃用户</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{item.activeUsers}</p>
                </div>
                <div className="text-xs leading-6 text-slate-500">
                  <p>创建于 {formatDateTime(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
