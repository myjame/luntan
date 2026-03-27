import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import { upsertBadgeAction } from "@/modules/operations/actions";
import {
  badgeKindLabel,
  badgeKindOptions
} from "@/modules/operations/lib/constants";
import {
  getBadgeSummary,
  listBadgesForAdmin
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
    return "暂无记录";
  }

  return dateFormatter.format(value);
}

function getFeedback(result?: string, message?: string) {
  if (result === "saved") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "勋章或头衔已保存",
      message: message ?? "配置修改已经写入后台。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "保存未完成",
      message: message ?? "请检查字段后再重试。"
    };
  }

  return null;
}

function BadgeEditor({
  badge,
  heading,
  returnTo
}: {
  badge?: {
    id: string;
    kind: (typeof badgeKindOptions)[number]["value"];
    name: string;
    description: string | null;
    iconUrl: string | null;
    grantCondition: string | null;
    isActive: boolean;
  };
  heading: string;
  returnTo: string;
}) {
  return (
    <form action={upsertBadgeAction} className="space-y-4 rounded-[1.5rem] border border-black/8 bg-white/72 p-5">
      <input name="id" type="hidden" value={badge?.id ?? ""} />
      <input name="returnTo" type="hidden" value={returnTo} />

      <div>
        <p className="text-base font-semibold text-slate-950">{heading}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          勋章和头衔先在后台定义规范，后续可以接入自动授予或人工指派。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">类型</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={badge?.kind ?? badgeKindOptions[0].value}
            name="kind"
          >
            {badgeKindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">名称</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={badge?.name ?? ""}
            name="name"
            placeholder="例如：深夜影评人"
            required
            type="text"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">简介说明</span>
        <input
          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={badge?.description ?? ""}
          name="description"
          placeholder="一句话说明展示价值或人设含义"
          type="text"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">图标地址</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={badge?.iconUrl ?? ""}
            name="iconUrl"
            placeholder="可选，用于前台展示"
            type="text"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">状态</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={String(badge?.isActive ?? true)}
            name="isActive"
          >
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">授予条件</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-[1.3rem] border border-black/10 bg-white/88 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={badge?.grantCondition ?? ""}
          name="grantCondition"
          placeholder="例如：连续 30 天活跃且影评获赞超过 200。"
        />
      </label>

      <button
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
        type="submit"
      >
        {badge ? "保存配置" : "新增配置"}
      </button>
    </form>
  );
}

export default async function AdminBadgesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [summary, badges] = await Promise.all([getBadgeSummary(), listBadgesForAdmin()]);
  const feedback = getFeedback(params.result, params.message);

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "勋章头衔" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 勋章头衔</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">身份标识要有规则感，也要有社区气质。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里用于维护勋章和头衔定义，包括前台展示名、图标、说明文案和授予条件。人工授予与展示位设置已经接到用户详情页，后续再补自动授予规则。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/points">查看积分规则</ButtonLink>
          <ButtonLink href="/admin/users" variant="secondary">
            去用户详情授予
          </ButtonLink>
          <ButtonLink href="/admin/logs" variant="secondary">
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
        <MetricCard accent="总量" label="配置总数" value={String(summary.totalCount)} />
        <MetricCard accent="启用" label="启用配置" value={String(summary.activeCount)} />
        <MetricCard accent="勋章" label="勋章数" value={String(summary.badgeCount)} />
        <MetricCard accent="头衔" label="头衔数" value={String(summary.titleCount)} />
      </div>

      <SurfaceCard>
        <div className="border-b border-black/8 pb-5">
          <p className="eyebrow">新增配置</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">创建勋章或头衔</h3>
        </div>
        <div className="mt-5">
          <BadgeEditor heading="新增身份配置" returnTo="/admin/badges" />
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-black/8 px-6 py-5">
          <p className="eyebrow">配置列表</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前勋章与头衔</h3>
        </div>

        {badges.length === 0 ? (
          <div className="px-6 py-6 text-sm leading-7 text-slate-600">当前还没有勋章或头衔配置。</div>
        ) : (
          <div className="space-y-4 px-6 py-6">
            {badges.map((badge) => (
              <div key={badge.id}>
                <div className="mb-3 flex flex-wrap items-center gap-3 px-1">
                  <span className="inline-flex rounded-full border border-black/10 bg-white/82 px-3 py-1 text-xs font-semibold text-slate-700">
                    {badgeKindLabel[badge.kind]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {badge.isActive ? "当前启用" : "当前停用"} · 已授予 {badge._count.userBadges} 次
                  </span>
                </div>
                <BadgeEditor badge={badge} heading={`编辑配置 · ${badge.name}`} returnTo="/admin/badges" />
                <div className="mt-3 px-1 text-xs leading-6 text-slate-500">
                  <p>创建时间：{formatDateTime(badge.createdAt)}</p>
                  <p>最近更新：{formatDateTime(badge.updatedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
