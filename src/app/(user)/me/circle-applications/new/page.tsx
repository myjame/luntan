import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { CircleApplicationForm } from "@/modules/community/components/circle-application-form";
import {
  getWorkflowStatusMeta,
  listCircleCategories,
  listCurrentUserCircleApplications
} from "@/modules/community/lib/service";
import { requireActiveUser } from "@/modules/auth/lib/guards";

type SearchParams = Promise<{
  result?: string;
}>;

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

export default async function CircleApplicationPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const [params, user] = await Promise.all([searchParams, requireActiveUser()]);
  const [categories, applications] = await Promise.all([
    listCircleCategories(),
    listCurrentUserCircleApplications(user.id)
  ]);

  return (
    <div className="space-y-6 pt-2">
      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">用户中心 / 圈子申请</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">把想做的圈子先交给后台审核，再把它慢慢运营起来。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          首版不支持用户即时创建圈子，所以这里统一提交圈子申请。审核通过后会自动生成圈子，并把你设为圈主。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/circles" variant="secondary">
            浏览圈子列表
          </ButtonLink>
          <ButtonLink href="/me">返回我的主页</ButtonLink>
        </div>
      </div>

      {params.result === "submitted" ? (
        <div className="rounded-[1.5rem] border border-emerald-500/16 bg-emerald-500/8 px-5 py-4 text-emerald-900">
          <p className="text-sm font-semibold">申请已提交</p>
          <p className="mt-2 text-sm leading-7">你的圈子申请已经进入后台审核队列，后续会在这里显示处理结果。</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.85fr)]">
        <SurfaceCard>
          <p className="eyebrow">新建申请</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">提交一个新的圈子想法</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            申请时先聚焦分类、名称、slug、简介、圈规和是否允许匿名。公告会在圈子上线后由圈主管理。
          </p>
          <div className="mt-6">
            <CircleApplicationForm
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name
              }))}
            />
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="h-fit">
            <p className="eyebrow">我的申请</p>
            {applications.length === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-dashed border-black/10 bg-white/70 px-4 py-5 text-sm leading-7 text-slate-600">
                你还没有提交过圈子申请。可以先从一个主题聚焦、规则清晰的小圈子开始。
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {applications.map((application) => {
                  const statusMeta = getWorkflowStatusMeta(application.status);

                  return (
                    <div className="rounded-[1.25rem] border border-black/8 bg-white/78 p-4" key={application.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold tracking-tight text-slate-950">{application.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {application.category.name} · {application.slug}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{application.intro}</p>
                      <div className="mt-4 space-y-1 text-sm text-slate-500">
                        <p>提交时间：{formatDateTime(application.createdAt)}</p>
                        {application.reviewedAt ? <p>审核时间：{formatDateTime(application.reviewedAt)}</p> : null}
                        {application.reviewNote ? <p>审核说明：{application.reviewNote}</p> : null}
                      </div>
                      {application.status === "APPROVED" && application.circle ? (
                        <div className="mt-4">
                          <Link
                            className="text-sm font-semibold text-[var(--color-accent)]"
                            href={`/circles/${application.circle.slug}`}
                          >
                            进入已上线圈子
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="h-fit bg-[linear-gradient(155deg,rgba(255,255,255,0.94),rgba(23,107,108,0.08))]">
            <p className="eyebrow">申请建议</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>圈子名称尽量明确兴趣范围，避免过泛的公共词。</li>
              <li>圈规先写最核心的 3 到 5 条，不要一开始就堆复杂制度。</li>
              <li>匿名能力默认谨慎开启，后续也可以在圈主管理页再调整。</li>
            </ul>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
