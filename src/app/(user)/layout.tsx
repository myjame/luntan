import type { ReactNode } from "react";
import Link from "next/link";

import { logoutAction } from "@/modules/auth/actions";
import { requireActiveUser } from "@/modules/auth/lib/guards";

export const dynamic = "force-dynamic";

export default async function UserLayout({ children }: { children: ReactNode }) {
  const user = await requireActiveUser();
  const displayName = user.profile?.nickname ?? user.username;

  return (
    <div className="page-shell min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">用户中心</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {displayName} 的社区空间
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/">
              返回首页
            </Link>
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me">
              我的主页
            </Link>
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me/notifications">
              我的通知
            </Link>
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me/messages">
              我的私信
            </Link>
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me/points">
              我的积分
            </Link>
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me/posts">
              我的帖子
            </Link>
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me/comments">
              我的评论
            </Link>
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me/favorites">
              我的收藏
            </Link>
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me/follows">
              关注与粉丝
            </Link>
            <Link className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="/me/settings">
              账号设置
            </Link>
            <Link
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
              href="/me/delete-account"
            >
              注销申请
            </Link>
            {user.role === "SUPER_ADMIN" ? (
              <Link
                className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900"
                href="/admin"
              >
                去后台
              </Link>
            ) : null}
            <form action={logoutAction}>
              <button
                className="rounded-full border border-black/10 bg-transparent px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/80"
                type="submit"
              >
                退出登录
              </button>
            </form>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-6 pb-12 lg:px-10">{children}</main>
    </div>
  );
}
