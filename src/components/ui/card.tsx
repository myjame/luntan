import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SurfaceCard({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("surface-card", className)} {...props}>
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  accent = "暖色"
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <SurfaceCard className="min-h-32">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600">
          {accent}
        </span>
      </div>
    </SurfaceCard>
  );
}

export function ListCard({
  title,
  body,
  eyebrow,
  footer
}: {
  title: string;
  body: string;
  eyebrow?: string;
  footer?: ReactNode;
}) {
  return (
    <SurfaceCard className="h-full">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </SurfaceCard>
  );
}
