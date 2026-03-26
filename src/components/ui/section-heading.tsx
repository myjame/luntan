import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  aside
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-4 text-base leading-8 text-slate-600">{description}</p>
      </div>
      {aside ? <div>{aside}</div> : null}
    </div>
  );
}
