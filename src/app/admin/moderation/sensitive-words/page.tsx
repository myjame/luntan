import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard, SurfaceCard } from "@/components/ui/card";
import {
  sensitiveWordActionLabel,
  sensitiveWordLevelMeta
} from "@/modules/moderation/lib/constants";
import { listSensitiveWordsForAdmin } from "@/modules/moderation/lib/service";

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

export default async function AdminSensitiveWordsPage() {
  const data = await listSensitiveWordsForAdmin();

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "敏感词" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">后台 / 敏感词</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">把词库规则透明化，审核判断才会稳定。</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          首版先展示敏感词词库和对应动作。系统已经根据动作自动执行严重拦截、疑似送审和一般提示修改。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/admin/moderation/reviews">返回内容审核</ButtonLink>
          <ButtonLink href="/admin/logs" variant="secondary">
            查看操作日志
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="全部" label="启用词数" value={String(data.summary.activeCount)} />
        <MetricCard accent="拦截" label="严重词" value={String(data.summary.severeCount)} />
        <MetricCard accent="送审" label="疑似词" value={String(data.summary.suspectCount)} />
        <MetricCard accent="提示" label="一般词" value={String(data.summary.generalCount)} />
      </div>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-black/8 px-6 py-5">
          <p className="eyebrow">词库总表</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">当前敏感词规则</h3>
        </div>

        {data.items.length === 0 ? (
          <div className="px-6 py-6 text-sm leading-7 text-slate-600">当前还没有配置敏感词。</div>
        ) : (
          <div className="divide-y divide-black/6">
            {data.items.map((item) => {
              const levelMeta = sensitiveWordLevelMeta[item.level];

              return (
                <div className="grid gap-4 px-6 py-5 md:grid-cols-[180px_160px_minmax(0,1fr)_170px]" key={item.id}>
                  <div>
                    <p className="text-base font-semibold text-slate-950">{item.word}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.isActive ? "启用中" : "已停用"}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${levelMeta.className}`}>
                      {levelMeta.label}
                    </span>
                    <p className="mt-2 text-sm text-slate-600">{sensitiveWordActionLabel[item.action]}</p>
                  </div>
                  <div className="text-sm leading-7 text-slate-600">{item.note ?? "暂无备注说明。"}</div>
                  <div className="text-sm text-slate-500">
                    <p>创建：{formatDateTime(item.createdAt)}</p>
                    <p className="mt-1">更新：{formatDateTime(item.updatedAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
