import { Button } from "@/components/ui/button";
import { reportTypeOptions } from "@/modules/moderation/lib/constants";
import { submitReportAction } from "@/modules/moderation/actions";

export function ReportForm({
  targetType,
  targetId,
  returnTo,
  summaryLabel,
  description,
  className = "",
  defaultOpen = false
}: {
  targetType: string;
  targetId: string;
  returnTo: string;
  summaryLabel: string;
  description?: string;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className={`rounded-[1.2rem] border border-black/8 bg-white/70 ${className}`} open={defaultOpen}>
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-800">
        {summaryLabel}
      </summary>
      <div className="border-t border-black/8 px-4 py-4">
        {description ? <p className="text-sm leading-7 text-slate-600">{description}</p> : null}
        <form action={submitReportAction} className="mt-3 space-y-3">
          <input name="targetType" type="hidden" value={targetType} />
          <input name="targetId" type="hidden" value={targetId} />
          <input name="returnTo" type="hidden" value={returnTo} />

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">举报类型</span>
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              defaultValue={reportTypeOptions[0]?.value}
              name="reportType"
            >
              {reportTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">补充说明</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-[1.2rem] border border-black/10 bg-white/90 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
              name="detail"
              placeholder="可补充具体原因、上下文或证据线索。"
            />
          </label>

          <Button type="submit">提交举报</Button>
        </form>
      </div>
    </details>
  );
}
