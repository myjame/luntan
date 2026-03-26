import Link from "next/link";
import type { ReactNode } from "react";

import { SurfaceCard } from "@/components/ui/card";
import type { UserFollowCardItem } from "@/modules/social/lib/service";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric"
});

function buildInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function UserFollowCard({
  user,
  action
}: {
  user: UserFollowCardItem;
  action?: ReactNode;
}) {
  return (
    <SurfaceCard className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,#c55e3d,#efc4af)] text-lg font-bold text-white">
            {buildInitials(user.displayName)}
          </div>
          <div>
            <Link
              className="text-lg font-semibold tracking-tight text-slate-950 transition hover:text-[var(--color-accent)]"
              href={`/users/${user.username}`}
            >
              {user.displayName}
            </Link>
            <p className="mt-1 text-sm text-slate-500">@{user.username}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {user.bio ?? "这个用户还没有填写个人简介。"}
            </p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
        <span>{user.points} 积分</span>
        <span>
          最近活跃：
          {user.lastActiveAt ? dateFormatter.format(user.lastActiveAt) : "暂无记录"}
        </span>
      </div>
    </SurfaceCard>
  );
}
