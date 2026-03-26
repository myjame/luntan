import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);

  return Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
}

export function AdminPagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  hrefBuilder
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hrefBuilder: (page: number) => string;
}) {
  if (totalCount === 0 || totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-[1.4rem] border border-black/8 bg-white/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-slate-600">
        共 {totalCount} 条，当前第 {page} / {totalPages} 页，每页 {pageSize} 条。
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <PaginationLink disabled={page <= 1} href={hrefBuilder(page - 1)}>
          上一页
        </PaginationLink>

        {visiblePages.map((value, index) => {
          const previous = visiblePages[index - 1];
          const showGap = previous && value - previous > 1;

          return (
            <div className="flex items-center gap-2" key={value}>
              {showGap ? <span className="px-1 text-slate-400">...</span> : null}
              <PaginationLink active={value === page} href={hrefBuilder(value)}>
                {value}
              </PaginationLink>
            </div>
          );
        })}

        <PaginationLink disabled={page >= totalPages} href={hrefBuilder(page + 1)}>
          下一页
        </PaginationLink>
      </div>
    </div>
  );
}

function PaginationLink({
  active = false,
  children,
  disabled = false,
  href
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  href: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white/55 px-4 py-2 text-sm font-medium text-slate-400">
        {children}
      </span>
    );
  }

  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-[0_16px_35px_rgba(197,94,61,0.24)]"
          : "border-black/8 bg-white/80 text-slate-700 hover:-translate-y-0.5 hover:bg-white"
      )}
      href={href}
    >
      {children}
    </Link>
  );
}
