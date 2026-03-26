import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { featuredCircles } from "@/lib/site-data";

const categories = ["影视", "游戏", "动漫", "运动", "美食", "音乐", "生活", "情感", "校园"];

export default function CirclesPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
      <SectionHeading
        aside={<ButtonLink href="/">返回首页</ButtonLink>}
        description="圈子是内容沉淀核心。首版先做公开浏览、关注、发帖和基础自治能力，不做圈内准入审批。"
        eyebrow="圈子系统"
        title="圈子页先做成有场域感的双栏空间。"
      />

      <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <SurfaceCard className="h-fit">
          <p className="eyebrow">一级分类</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {categories.map((category) => (
              <span
                className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700"
                key={category}
              >
                {category}
              </span>
            ))}
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-dashed border-black/12 bg-[rgba(255,255,255,0.56)] p-5">
            <p className="text-sm leading-7 text-slate-600">
              页面层面建议采用桌面端双栏布局：左侧承接封面、简介、规则、公告和活跃榜，右侧承接帖子流；移动端折叠为上下结构。
            </p>
          </div>
        </SurfaceCard>

        <div className="grid gap-5">
          {featuredCircles.map((circle) => (
            <SurfaceCard key={circle.name}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-semibold text-slate-900">
                    {circle.tone}
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{circle.name}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{circle.tagline}</p>
                </div>
                <div className="rounded-[1.25rem] bg-white/80 px-5 py-4 text-right shadow-[0_14px_30px_rgba(24,32,45,0.06)]">
                  <p className="text-sm text-slate-500">关注人数</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{circle.members}</p>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </div>
  );
}
