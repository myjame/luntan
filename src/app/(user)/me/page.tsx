import Link from "next/link";
import type { Route } from "next";

import { SurfaceCard } from "@/components/ui/card";
import { userQuickLinks } from "@/lib/navigation";
import { getCurrentUser } from "@/modules/auth/lib/guards";

const stats = [
  { label: "积分", value: "1,280" },
  { label: "关注", value: "46" },
  { label: "粉丝", value: "19" },
  { label: "收藏", value: "32" }
];

export default async function MePage() {
  const currentUser = await getCurrentUser();
  const profile = currentUser?.profile;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.76fr_1.24fr]">
      <SurfaceCard className="h-fit">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-[linear-gradient(135deg,#c55e3d,#efc4af)] text-2xl font-bold text-white">
            {(profile?.nickname ?? currentUser?.username ?? "JM").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-slate-950">
              {profile?.nickname ?? currentUser?.username ?? "社区用户"}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {profile?.bio ?? "社区原型搭建中，当前重点是产品闭环、视觉语言和后台治理结构。"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div className="rounded-[1.25rem] border border-black/8 bg-white/80 p-4" key={stat.label}>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <div className="grid gap-6">
        <SurfaceCard>
          <p className="eyebrow">我的模块</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {userQuickLinks.map((item) => (
              <Link
                className="rounded-[1.25rem] border border-black/8 bg-white/80 p-5 transition hover:-translate-y-0.5"
                href={item.href as Route}
                key={item.label}
              >
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">{item.label}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </Link>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(239,196,175,0.28))]">
          <p className="eyebrow">当前建议</p>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
            <li>先把通知、收藏、关注和隐私设置页做成可进入的列表页。</li>
            <li>个人主页要服务于“身份展示 + 内容沉淀 + 关系管理”。</li>
            <li>匿名发言时保留明确的前台展示提示，减少误用。</li>
          </ul>
        </SurfaceCard>
      </div>
    </div>
  );
}
