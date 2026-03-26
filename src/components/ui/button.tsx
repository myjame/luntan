import Link from "next/link";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

const baseButtonClassName =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

type Variant = "primary" | "secondary" | "ghost";

function getVariantClassName(variant: Variant) {
  if (variant === "secondary") {
    return "border border-black/10 bg-white/70 text-slate-900 shadow-[0_16px_35px_rgba(24,32,45,0.08)] hover:-translate-y-0.5 hover:bg-white";
  }

  if (variant === "ghost") {
    return "border border-transparent bg-transparent text-slate-700 hover:border-black/10 hover:bg-white/70";
  }

  return "bg-[var(--color-accent)] text-white shadow-[0_18px_40px_rgba(197,94,61,0.28)] hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(197,94,61,0.34)]";
}

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
  }
>;

export function Button({
  children,
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseButtonClassName, getVariantClassName(variant), className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  className,
  href,
  variant = "primary"
}: PropsWithChildren<{
  href: string;
  className?: string;
  variant?: Variant;
}>) {
  return (
    <Link className={cn(baseButtonClassName, getVariantClassName(variant), className)} href={href}>
      {children}
    </Link>
  );
}
