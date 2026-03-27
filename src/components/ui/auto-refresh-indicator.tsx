"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AutoRefreshIndicator({
  intervalMs = 12000,
  label = "页面正在自动刷新"
}: {
  intervalMs?: number;
  label?: string;
}) {
  const router = useRouter();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastRefreshedAt(new Date());
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, router]);

  return (
    <p className="text-xs text-slate-500">
      {label}，最近刷新于 {lastRefreshedAt.toLocaleTimeString("zh-CN", { hour12: false })}。
    </p>
  );
}
