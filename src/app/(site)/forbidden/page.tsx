import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

type SearchParams = Promise<{
  reason?: string;
}>;

function resolveMessage(reason?: string) {
  if (reason === "admin-only") {
    return {
      title: "当前入口仅管理员可访问",
      description: "你的账号已登录，但权限不足以访问这个页面。"
    };
  }

  return {
    title: "当前账号没有权限访问该页面",
    description: "可以先返回首页或个人中心，继续浏览你有权限的内容。"
  };
}

export default async function ForbiddenPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const message = resolveMessage(params.reason);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow">无权限访问</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{message.title}</h1>
        <p className="mt-4 text-sm leading-8 text-slate-600">{message.description}</p>
      </div>

      <div className="surface-card">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">你现在可以做什么</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/">返回首页</ButtonLink>
          <ButtonLink href="/me" variant="secondary">
            去个人中心
          </ButtonLink>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900"
            href="/account-status?status=ACTIVE"
          >
            查看账号状态
          </Link>
        </div>
      </div>
    </div>
  );
}
