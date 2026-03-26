import { ListCard, SurfaceCard } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { pulseTopics } from "@/lib/site-data";

export default function SquarePage() {
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
        </SurfaceCard>

        <div className="grid gap-5">
          {pulseTopics.map((topic, index) => (
            <ListCard
              body={topic.body}
              eyebrow={`${topic.meta} · ${(index + 1).toString().padStart(2, "0")}`}
              footer={
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>热度 8.{index + 1}</span>
                  <span>评论 {18 + index * 7}</span>
                  <span>收藏 {6 + index * 4}</span>
                </div>
              }
              key={topic.title}
              title={topic.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
