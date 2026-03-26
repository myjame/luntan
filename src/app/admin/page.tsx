import { SurfaceCard } from "@/components/ui/card";

const adminStats = [
  { label: "待审用户", value: "14" },
  { label: "待审内容", value: "28" },
  { label: "待处理举报", value: "9" },
  { label: "今日运营位", value: "3" }
];

const queues = [
  {
    title: "注册审核队列",
    body: "处理 pending_review 用户，审核结果直接影响登录能力。"
  },
  {
    title: "内容审核队列",
    body: "承接新用户观察期内的帖子与评论审核，以及疑似风险词命中内容。"
  },
  {
    title: "举报处理流",
    body: "按固定举报类型快速分发到删帖、禁言、封号或忽略处理。"
  }
];

export default function AdminPage() {
  return (
    <div className="space-y-6 pt-2">
      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台总览</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">先把治理链路做厚，再把社区放开。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这个后台壳已经按用户审核、内容审核、圈子管理、运营位配置的方向拆好。后续只需要按任务清单逐页填充查询、表格和操作流。
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {adminStats.map((stat) => (
          <SurfaceCard key={stat.label}>
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
          </SurfaceCard>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {queues.map((item) => (
          <SurfaceCard key={item.title}>
            <p className="eyebrow">关键队列</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
