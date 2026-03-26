"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminSections } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isSectionActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 space-y-3">
      {adminSections.map((section) => {
        const active = isSectionActive(pathname, section.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "block rounded-[1.35rem] border p-4 transition duration-300",
              active
                ? "border-[rgba(239,196,175,0.4)] bg-[rgba(255,255,255,0.12)] shadow-[0_18px_45px_rgba(0,0,0,0.12)]"
                : "border-white/8 bg-white/5 hover:border-white/14 hover:bg-white/8"
            )}
            href={section.href}
            key={section.href}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white">{section.label}</p>
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition",
                  active ? "bg-[var(--color-accent-soft)] shadow-[0_0_16px_rgba(239,196,175,0.65)]" : "bg-white/25"
                )}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.72)]">{section.description}</p>
          </Link>
        );
      })}
    </nav>
  );
}
