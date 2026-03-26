import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function AdminBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="后台面包屑" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span className="flex items-center gap-2" key={`${item.label}-${index}`}>
            {item.href && !isLast ? (
              <Link className="transition hover:text-slate-950" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-semibold text-slate-900" : undefined}>{item.label}</span>
            )}
            {!isLast ? <span className="text-slate-300">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
