import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { ListCard, MetricCard, SurfaceCard } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  featuredCircles,
  heroMetrics,
  launchSteps,
  moderationHighlights,
  pulseTopics,
  visualGuidelines
} from "@/lib/site-data";

export default function HomePage() {
  const circleAnimationClasses = ["fade-up delay-1", "fade-up delay-2", "fade-up delay-3"];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-20 px-6 py-10 lg:px-10 lg:py-14">
      <section className="dashboard-grid items-stretch">
        <div className="hero-panel grain-panel fade-up px-7 py-8 sm:px-10 sm:py-10">
          <p className="eyebrow">公开浏览 · 审核后互动 · 圈子沉淀</p>
          <h1 className="display-title mt-6 max-w-4xl text-slate-950">
            把兴趣社区做成有热度、也有秩序的公共空间。
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            当前项目采用一体化 Next.js 工程承接前台、用户中心、后台和 API。先跑通用户闭环，再把视觉、
            运营和社区氛围做出辨识度。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/square">进入广场原型</ButtonLink>
            <ButtonLink href="/circles" variant="secondary">
              查看圈子结构
            </ButtonLink>
            <Link className="px-2 text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/admin">
              运营后台预览
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {heroMetrics.map((item) => (
              <MetricCard accent="骨架已就绪" key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SurfaceCard className="fade-up delay-1">
            <p className="eyebrow">工程定位</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              工程上放一起，逻辑上分前后端。
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>前台公开页负责内容发现、SEO 和社区氛围。</li>
              <li>用户区负责身份展示、通知、私信和个人沉淀。</li>
              <li>后台负责审核、治理、运营位和规则维护。</li>
              <li>服务层统一承接权限、审核状态和数据访问。</li>
            </ul>
          </SurfaceCard>

          <SurfaceCard className="fade-up delay-2 bg-[linear-gradient(145deg,rgba(23,107,108,0.92),rgba(16,63,64,0.94))] text-white">
            <p className="eyebrow !text-[rgba(255,255,255,0.72)]">视觉方向</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">先把社区气质做出来。</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[rgba(255,255,255,0.82)]">
              {visualGuidelines.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SurfaceCard>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          aside={
            <ButtonLink href="/discover" variant="secondary">
              看发现页方向
            </ButtonLink>
          }
          description="首屏不只是帖子列表，而是把推荐圈子、热点议题、活动感区块和社区秩序一起立起来。"
          eyebrow="首版节奏"
          title="先跑闭环，再把体验做得让人愿意停留。"
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {launchSteps.map((step, index) => (
            <ListCard
              body={step.body}
              eyebrow={`Step 0${index + 1}`}
              key={step.title}
              title={step.title}
            />
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <SectionHeading
          description="推荐圈子在社区早期承担内容沉淀和用户心智建设，视觉上要比普通列表更像是值得加入的场所。"
          eyebrow="推荐圈子"
          title="圈子不是分区标签，而是有气氛的内容房间。"
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {featuredCircles.map((circle, index) => (
            <SurfaceCard className={circleAnimationClasses[index] ?? "fade-up"} key={circle.name}>
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-semibold text-slate-900">
                  {circle.tone}
                </span>
                <span className="text-sm text-slate-500">{circle.members} 成员</span>
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">{circle.name}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{circle.tagline}</p>
              <div className="mt-6">
                <ButtonLink className="w-full" href="/circles" variant="secondary">
                  进入圈子结构页
                </ButtonLink>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard>
          <SectionHeading
            description="社区感不仅来自帖子内容，也来自“今天聊什么”“此刻哪件事最热”的节奏设计。"
            eyebrow="活动感"
            title="首页要有值得点进去的理由。"
          />
          <div className="mt-8 space-y-4">
            {pulseTopics.map((topic) => (
              <div
                className="rounded-[1.25rem] border border-black/8 bg-white/75 p-5 transition hover:-translate-y-0.5"
                key={topic.title}
              >
                <p className="eyebrow">{topic.meta}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{topic.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{topic.body}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(255,246,239,0.92))]">
          <SectionHeading
            description="公开社区能不能放开手做浏览，关键取决于审核、匿名追溯、限流和后台操作日志有没有先落好。"
            eyebrow="治理底座"
            title="有热度，也要有秩序。"
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {moderationHighlights.map((item) => (
              <div className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5" key={item}>
                <p className="text-sm leading-7 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
