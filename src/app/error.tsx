"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global render error:", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <div className="page-shell flex min-h-screen items-center justify-center px-6">
          <div className="hero-panel max-w-2xl px-8 py-10">
            <p className="eyebrow">页面错误</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              页面加载遇到异常，先别慌，我们已经捕获到错误。
            </h1>
            <p className="mt-4 text-sm leading-8 text-slate-600">
              你可以先重试一次，或返回首页继续浏览。如果问题持续出现，建议把操作路径反馈给开发者。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white"
                onClick={() => reset()}
                type="button"
              >
                重新加载当前页面
              </button>
              <Link
                className="rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900"
                href="/"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
