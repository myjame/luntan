import Link from "next/link";

import {
  RecommendationSlotType,
  RecommendationTargetType
} from "@/generated/prisma/client";
import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import {
  upsertBannerAction,
  upsertRecommendationSlotAction
} from "@/modules/operations/actions";
import {
  bannerStatusMeta,
  bannerStatusOptions,
  homeRecommendationSlotOptions,
  recommendationSlotTypeLabel,
  recommendationTargetOptions,
  recommendationTargetTypeLabel
} from "@/modules/operations/lib/constants";
import {
  getHomeOperationContent,
  getOperationOverview,
  listBannersForAdmin,
  listOperationCircleTargets,
  listRecommendationSlotsForAdmin
} from "@/modules/operations/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

type SearchParams = Promise<{
  result?: string;
  message?: string;
}>;

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "未设置";
  }

  return dateFormatter.format(value);
}

function formatDateInput(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function resolveHref(value?: string | null) {
  return value && value.trim() ? value : "#";
}

function getFeedback(result?: string, message?: string) {
  if (result === "saved") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "运营配置已保存",
      message: message ?? "新的首页运营位已经生效。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "保存未完成",
      message: message ?? "请检查输入后再重试。"
    };
  }

  return null;
}

function BannerEditor({
  banner,
  heading,
  returnTo
}: {
  banner?: {
    id: string;
    title: string;
    subtitle: string | null;
    imageUrl: string;
    linkUrl: string | null;
    sortOrder: number;
    status: (typeof bannerStatusOptions)[number]["value"];
    startsAt: Date | null;
    endsAt: Date | null;
  };
  heading: string;
  returnTo: string;
}) {
  return (
    <form action={upsertBannerAction} className="space-y-4 rounded-[1.5rem] border border-black/8 bg-white/72 p-5">
      <input name="id" type="hidden" value={banner?.id ?? ""} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-slate-950">{heading}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Banner 会进入首页主视觉区，用来承接节日活动、重点运营和品牌氛围。
          </p>
        </div>
        {banner ? (
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${bannerStatusMeta[banner.status].className}`}>
            {bannerStatusMeta[banner.status].label}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">标题</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={banner?.title ?? ""}
            name="title"
            placeholder="例如：春季观影周"
            required
            type="text"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">副标题</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={banner?.subtitle ?? ""}
            name="subtitle"
            placeholder="一句话说明活动节奏或页面定位"
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">图片地址</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={banner?.imageUrl ?? ""}
            name="imageUrl"
            placeholder="https://example.com/banner.jpg"
            required
            type="text"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">跳转地址</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={banner?.linkUrl ?? ""}
            name="linkUrl"
            placeholder="/discover 或 https://..."
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">状态</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={banner?.status ?? bannerStatusOptions[0].value}
            name="status"
          >
            {bannerStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">排序</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={banner?.sortOrder ?? 0}
            min={0}
            name="sortOrder"
            type="number"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">开始日期</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={formatDateInput(banner?.startsAt)}
            name="startsAt"
            type="date"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">结束日期</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={formatDateInput(banner?.endsAt)}
            name="endsAt"
            type="date"
          />
        </label>
      </div>

      <button
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
        type="submit"
      >
        {banner ? "保存 Banner" : "新增 Banner"}
      </button>
    </form>
  );
}

function RecommendationEditor({
  circles,
  heading,
  returnTo,
  slot
}: {
  circles: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  heading: string;
  returnTo: string;
  slot?: {
    id: string;
    slotType: RecommendationSlotType;
    targetType: RecommendationTargetType;
    title: string;
    description: string | null;
    targetId: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  };
}) {
  return (
    <form
      action={upsertRecommendationSlotAction}
      className="space-y-4 rounded-[1.5rem] border border-black/8 bg-white/72 p-5"
    >
      <input name="id" type="hidden" value={slot?.id ?? ""} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <div>
        <p className="text-base font-semibold text-slate-950">{heading}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          平台级推荐位只允许超级管理员调整，圈主和圈管继续在各自圈子里做内容运营。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">推荐位类型</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={slot?.slotType ?? homeRecommendationSlotOptions[0].value}
            name="slotType"
          >
            {homeRecommendationSlotOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">目标类型</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={slot?.targetType ?? recommendationTargetOptions[0].value}
            name="targetType"
          >
            {recommendationTargetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">标题</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={slot?.title ?? ""}
            name="title"
            placeholder="例如：本周推荐圈子"
            required
            type="text"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">描述</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={slot?.description ?? ""}
            name="description"
            placeholder="给前台卡片一段更像运营语气的文案"
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">目标圈子</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={slot?.targetId ?? ""}
            name="targetId"
          >
            <option value="">未绑定圈子</option>
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name} · /circles/{circle.slug}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">跳转地址</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={slot?.linkUrl ?? ""}
            name="linkUrl"
            placeholder="/posts/xxx 或 https://..."
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_160px_150px]">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">配图地址</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={slot?.imageUrl ?? ""}
            name="imageUrl"
            placeholder="可选，用来增强卡片氛围"
            type="text"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">排序</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={slot?.sortOrder ?? 0}
            min={0}
            name="sortOrder"
            type="number"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">启用状态</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={String(slot?.isActive ?? true)}
            name="isActive"
          >
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
        </label>

        <div className="text-sm leading-6 text-slate-500">
          <p className="font-semibold text-slate-700">说明</p>
          <p className="mt-2">推荐圈子优先绑定圈子，活动和话题优先填链接。</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">开始日期</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={formatDateInput(slot?.startsAt)}
            name="startsAt"
            type="date"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">结束日期</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={formatDateInput(slot?.endsAt)}
            name="endsAt"
            type="date"
          />
        </label>
      </div>

      <button
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
        type="submit"
      >
        {slot ? "保存推荐位" : "新增推荐位"}
      </button>
    </form>
  );
}

export default async function AdminOperationsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [overview, banners, slots, circles, preview] = await Promise.all([
    getOperationOverview(),
    listBannersForAdmin(),
    listRecommendationSlotsForAdmin(),
    listOperationCircleTargets(),
    getHomeOperationContent()
  ]);
  const feedback = getFeedback(params.result, params.message);

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "运营位管理" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 运营位管理</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">首页要有节奏感，运营位就不能只靠静态占位。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里统一管理首页 Banner、推荐圈子、活动入口和今日话题。平台级运营位只允许超级管理员维护，圈内推荐仍然由圈主和圈管在各自圈子里完成。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/">查看首页效果</ButtonLink>
          <ButtonLink href="/admin/posts" variant="secondary">
            返回帖子运营
          </ButtonLink>
          <ButtonLink href="/admin/logs" variant="ghost">
            查看操作日志
          </ButtonLink>
        </div>
      </div>

      {feedback ? (
        <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-2 text-sm leading-7">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="主视觉" label="生效 Banner" value={String(overview.activeBannerCount)} />
        <MetricCard accent="圈子" label="推荐圈子位" value={String(overview.recommendedCircleCount)} />
        <MetricCard accent="活动" label="活动入口位" value={String(overview.activityCount)} />
        <MetricCard accent="话题" label="今日话题位" value={String(overview.topicCount)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="grain-panel">
          <p className="eyebrow">权限边界</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">平台级运营和圈内运营要分层，不混权限。</h3>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
            <p>首页 Banner、推荐圈子、活动入口、今日话题属于平台级曝光位，只允许超级管理员维护。</p>
            <p>圈主和圈管继续在圈子详情、帖子和评论内做日常运营，不直接进入平台首页推荐位。</p>
            <p>帖子置顶、精华、推荐已在帖子管理页统一收口，首页再根据运营位和真实内容流组合展示。</p>
          </div>
        </SurfaceCard>

        <SurfaceCard className="grain-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">前台预览</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前首页会优先读取这里的真实运营配置。</h3>
            </div>
            <ButtonLink href="/" variant="secondary">
              打开首页
            </ButtonLink>
          </div>

          <div className="mt-6 space-y-4">
            {preview.banners.length === 0 && preview.recommendedCircles.length === 0 && preview.activitySlots.length === 0 && preview.topicSlots.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-black/10 bg-white/70 px-5 py-6 text-sm leading-7 text-slate-600">
                当前还没有生效的首页运营位，首页会继续回退到静态示意内容。
              </div>
            ) : (
              <>
                {preview.banners.length > 0 ? (
                  <div className="rounded-[1.45rem] border border-black/8 bg-white/78 p-5">
                    <p className="text-sm font-semibold text-slate-700">主 Banner</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {preview.banners.map((banner) => (
                        <a
                          className="rounded-[1.3rem] border border-black/8 bg-[linear-gradient(145deg,rgba(16,63,64,0.96),rgba(23,107,108,0.92))] p-4 text-white transition hover:-translate-y-0.5"
                          href={resolveHref(banner.linkUrl)}
                          key={banner.id}
                        >
                          <p className="text-lg font-semibold">{banner.title}</p>
                          <p className="mt-2 text-sm text-[rgba(255,255,255,0.76)]">
                            {banner.subtitle ?? "无副标题"}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-black/8 bg-white/78 p-5">
                    <p className="text-sm font-semibold text-slate-700">推荐圈子</p>
                    <div className="mt-4 space-y-3">
                      {preview.recommendedCircles.length === 0 ? (
                        <p className="text-sm leading-7 text-slate-500">暂未配置。</p>
                      ) : (
                        preview.recommendedCircles.map((slot) => (
                          <div className="rounded-[1.2rem] border border-black/8 bg-white/82 px-4 py-3" key={slot.id}>
                            <p className="font-semibold text-slate-950">{slot.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {slot.circle?.name ?? slot.linkUrl ?? "未绑定目标"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-black/8 bg-white/78 p-5">
                    <p className="text-sm font-semibold text-slate-700">活动与话题</p>
                    <div className="mt-4 space-y-3">
                      {[...preview.activitySlots, ...preview.topicSlots].length === 0 ? (
                        <p className="text-sm leading-7 text-slate-500">暂未配置。</p>
                      ) : (
                        [...preview.activitySlots, ...preview.topicSlots].map((slot) => (
                          <div className="rounded-[1.2rem] border border-black/8 bg-white/82 px-4 py-3" key={slot.id}>
                            <p className="text-sm text-slate-500">{recommendationSlotTypeLabel[slot.slotType]}</p>
                            <p className="mt-1 font-semibold text-slate-950">{slot.title}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="space-y-5">
          <SurfaceCard>
            <div className="border-b border-black/8 pb-5">
              <p className="eyebrow">Banner</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">新建 Banner</h3>
            </div>
            <div className="mt-5">
              <BannerEditor heading="新增首页 Banner" returnTo="/admin/operations" />
            </div>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <div className="border-b border-black/8 px-6 py-5">
              <p className="eyebrow">现有配置</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Banner 列表</h3>
            </div>

            {banners.length === 0 ? (
              <div className="px-6 py-6 text-sm leading-7 text-slate-600">当前还没有 Banner 配置。</div>
            ) : (
              <div className="space-y-4 px-6 py-6">
                {banners.map((banner) => (
                  <div key={banner.id}>
                    <BannerEditor
                      banner={banner}
                      heading={`编辑 Banner · ${banner.title}`}
                      returnTo="/admin/operations"
                    />
                    <div className="mt-3 px-1 text-xs leading-6 text-slate-500">
                      <p>创建时间：{formatDateTime(banner.createdAt)}</p>
                      <p>最近更新：{formatDateTime(banner.updatedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="space-y-5">
          <SurfaceCard>
            <div className="border-b border-black/8 pb-5">
              <p className="eyebrow">推荐位</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">新增首页推荐位</h3>
            </div>
            <div className="mt-5">
              <RecommendationEditor
                circles={circles.map((circle) => ({
                  id: circle.id,
                  name: circle.name,
                  slug: circle.slug
                }))}
                heading="新增推荐位"
                returnTo="/admin/operations"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <div className="border-b border-black/8 px-6 py-5">
              <p className="eyebrow">现有配置</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">首页推荐位列表</h3>
            </div>

            {slots.length === 0 ? (
              <div className="px-6 py-6 text-sm leading-7 text-slate-600">当前还没有首页推荐位配置。</div>
            ) : (
              <div className="space-y-4 px-6 py-6">
                {slots.map((slot) => (
                  <div key={slot.id}>
                    <div className="mb-3 flex flex-wrap items-center gap-3 px-1">
                      <span className="inline-flex rounded-full border border-black/10 bg-white/82 px-3 py-1 text-xs font-semibold text-slate-700">
                        {recommendationSlotTypeLabel[slot.slotType]}
                      </span>
                      <span className="inline-flex rounded-full border border-black/10 bg-white/82 px-3 py-1 text-xs font-semibold text-slate-700">
                        {recommendationTargetTypeLabel[slot.targetType]}
                      </span>
                      <span className="text-xs text-slate-500">
                        {slot.isActive ? "当前启用" : "当前停用"} · 排序 {slot.sortOrder}
                      </span>
                    </div>
                    <RecommendationEditor
                      circles={circles.map((circle) => ({
                        id: circle.id,
                        name: circle.name,
                        slug: circle.slug
                      }))}
                      heading={`编辑推荐位 · ${slot.title}`}
                      returnTo="/admin/operations"
                      slot={slot}
                    />
                    <div className="mt-3 px-1 text-xs leading-6 text-slate-500">
                      <p>
                        当前目标：
                        {slot.targetCircle ? (
                          <Link className="text-[var(--color-accent)]" href={`/circles/${slot.targetCircle.slug}`}>
                            {slot.targetCircle.name}
                          </Link>
                        ) : (
                          slot.linkUrl ?? slot.targetId ?? "未绑定"
                        )}
                      </p>
                      <p>创建时间：{formatDateTime(slot.createdAt)}</p>
                      <p>最近更新：{formatDateTime(slot.updatedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
