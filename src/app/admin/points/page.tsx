import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import { upsertPointRuleAction } from "@/modules/operations/actions";
import {
  pointEventTypeLabel,
  pointEventTypeOptions
} from "@/modules/operations/lib/constants";
import {
  getPointRuleSummary,
  listPointRulesForAdmin
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
      title: "积分规则已保存",
      message: message ?? "规则调整已经写入后台配置。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "保存未完成",
      message: message ?? "请检查规则输入后再重试。"
    };
  }

  return null;
}

function PointRuleEditor({
  heading,
  returnTo,
  rule
}: {
  heading: string;
  returnTo: string;
  rule?: {
    id: string;
    eventType: (typeof pointEventTypeOptions)[number]["value"];
    name: string;
    description: string | null;
    points: number;
    dailyLimit: number | null;
    isActive: boolean;
  };
}) {
  return (
    <form
      action={upsertPointRuleAction}
      className="space-y-4 rounded-[1.5rem] border border-black/8 bg-white/72 p-5"
    >
      <input name="id" type="hidden" value={rule?.id ?? ""} />
      <input name="returnTo" type="hidden" value={returnTo} />

      <div>
        <p className="text-base font-semibold text-slate-950">{heading}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          首版先把规则配置收口到后台，后续再把实际积分发放与流水页串上。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">触发事件</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={rule?.eventType ?? pointEventTypeOptions[0].value}
            name="eventType"
          >
            {pointEventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">规则名称</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={rule?.name ?? ""}
            name="name"
            placeholder="例如：发帖奖励"
            required
            type="text"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">规则说明</span>
        <input
          className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
          defaultValue={rule?.description ?? ""}
          name="description"
          placeholder="说明触发条件、是否需要防刷等"
          type="text"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">积分值</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={rule?.points ?? 0}
            name="points"
            type="number"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">每日上限</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={rule?.dailyLimit ?? ""}
            min={1}
            name="dailyLimit"
            placeholder="留空表示不限"
            type="number"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">规则状态</span>
          <select
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
            defaultValue={String(rule?.isActive ?? true)}
            name="isActive"
          >
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
        </label>
      </div>

      <button
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] transition hover:-translate-y-0.5"
        type="submit"
      >
        {rule ? "保存规则" : "新增规则"}
      </button>
    </form>
  );
}

export default async function AdminPointsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [summary, rules] = await Promise.all([getPointRuleSummary(), listPointRulesForAdmin()]);
  const feedback = getFeedback(params.result, params.message);

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "积分规则" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 积分规则</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">激励规则先规范，后面接流水和等级才不会乱。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          这里统一维护发帖、评论、获赞、被收藏等基础积分规则。首版先把规则配置和启停能力落地，后续再把实际发放逻辑与积分流水补齐。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/stats">查看统计页</ButtonLink>
          <ButtonLink href="/admin/badges" variant="secondary">
            去勋章头衔
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
        <MetricCard accent="总量" label="规则总数" value={String(summary.totalCount)} />
        <MetricCard accent="启用" label="启用规则" value={String(summary.activeCount)} />
        <MetricCard accent="限流" label="有日上限规则" value={String(summary.limitedCount)} />
        <MetricCard accent="峰值" label="最高单次积分" value={String(summary.highestPoints)} />
      </div>

      <SurfaceCard>
        <div className="border-b border-black/8 pb-5">
          <p className="eyebrow">新增规则</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">创建新的积分规则</h3>
        </div>
        <div className="mt-5">
          <PointRuleEditor heading="新增积分规则" returnTo="/admin/points" />
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-black/8 px-6 py-5">
          <p className="eyebrow">规则列表</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前积分规则</h3>
        </div>

        {rules.length === 0 ? (
          <div className="px-6 py-6 text-sm leading-7 text-slate-600">当前还没有积分规则配置。</div>
        ) : (
          <div className="space-y-4 px-6 py-6">
            {rules.map((rule) => (
              <div key={rule.id}>
                <div className="mb-3 flex flex-wrap items-center gap-3 px-1">
                  <span className="inline-flex rounded-full border border-black/10 bg-white/82 px-3 py-1 text-xs font-semibold text-slate-700">
                    {pointEventTypeLabel[rule.eventType]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {rule.isActive ? "当前启用" : "当前停用"} · {rule.points >= 0 ? "+" : ""}
                    {rule.points} 分
                  </span>
                </div>
                <PointRuleEditor heading={`编辑规则 · ${rule.name}`} returnTo="/admin/points" rule={rule} />
                <div className="mt-3 px-1 text-xs leading-6 text-slate-500">
                  <p>创建时间：{formatDateTime(rule.createdAt)}</p>
                  <p>最近更新：{formatDateTime(rule.updatedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
