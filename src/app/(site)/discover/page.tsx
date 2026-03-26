import { ListCard, SurfaceCard } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { featuredCircles, visualGuidelines } from "@/lib/site-data";

export default function DiscoverPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
      <SectionHeading
        description="发现页适合聚合推荐圈子、热门话题、热门榜和运营活动，让用户在浏览之外快速找到想留下来的理由。"
        eyebrow="发现页"
        title="把“发现效率”做成社区的情绪入口。"
      />

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard>
          <p className="eyebrow">热门话题</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            今天的发现页应该像一本会动的兴趣杂志。
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {visualGuidelines.map((item) => (
              <div className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5" key={item}>
                <p className="text-sm leading-7 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="grid gap-5">
          {featuredCircles.map((circle) => (
            <ListCard
              body={circle.tagline}
              eyebrow={`${circle.tone} · 推荐圈子`}
              key={circle.name}
              title={circle.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
