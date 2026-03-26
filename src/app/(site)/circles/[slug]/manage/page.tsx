import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { requireActiveUser } from "@/modules/auth/lib/guards";
import {
  addCircleManagerAction,
  removeCircleManagerAction
} from "@/modules/community/actions";
import { CircleSettingsForm } from "@/modules/community/components/circle-settings-form";
import {
  getManageableCircleBySlug,
  listCircleCategories
} from "@/modules/community/lib/service";

export const dynamic = "force-dynamic";

type PageParams = Promise<{
  slug: string;
}>;

type SearchParams = Promise<{
  result?: string;
  message?: string;
}>;

function getFeedback(result?: string, message?: string) {
  if (result === "updated") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "圈子资料已更新",
      message: message ?? "基础资料、圈规和公告已经保存。"
    };
  }

  if (result === "manager-added") {
    return {
      className: "border-emerald-500/16 bg-emerald-500/8 text-emerald-900",
      title: "圈管已添加",
      message: message ?? "新的圈管关系已经生效。"
    };
  }

  if (result === "manager-removed") {
    return {
      className: "border-slate-500/16 bg-slate-500/8 text-slate-800",
      title: "圈管已移除",
      message: message ?? "对应用户的圈管权限已经撤回。"
    };
  }

  if (result === "error") {
    return {
      className: "border-amber-500/16 bg-amber-500/10 text-amber-900",
      title: "操作未完成",
      message: message ?? "请检查输入后重试。"
    };
  }

  return null;
}

function getActorLabel(actorLabel: string | null) {
  if (actorLabel === "SUPER_ADMIN") {
    return "你正以超级管理员身份协助管理这个圈子。";
  }

  if (actorLabel === "OWNER") {
    return "你是这个圈子的圈主，可以维护资料和圈管名单。";
  }

  return "你当前是圈管，可维护圈子资料。";
}

export default async function CircleManagePage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const [{ slug }, query, user] = await Promise.all([
    params,
    searchParams,
    requireActiveUser()
  ]);
  const [categories, accessContext] = await Promise.all([
    listCircleCategories(),
    getManageableCircleBySlug({
      slug,
      actorId: user.id,
      actorRole: user.role
    })
  ]);

  if (!accessContext) {
    notFound();
  }

  if (!accessContext.canManage) {
    redirect(`/circles/${slug}`);
  }

  const feedback = getFeedback(query.result, query.message);
  const returnTo = `/circles/${accessContext.circle.slug}/manage`;
  const ownerName =
    accessContext.circle.owner?.profile?.nickname ??
    accessContext.circle.owner?.username ??
    "暂未分配圈主";
  const managerList = accessContext.circle.managers.filter(
    (item) =>
      item.userId !== accessContext.circle.ownerId && item.role === "MANAGER"
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="rounded-[2rem] border border-black/8 bg-[linear-gradient(135deg,rgba(255,251,247,0.96),rgba(233,242,240,0.9))] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
                href={`/circles/${accessContext.circle.slug}`}
              >
                {accessContext.circle.name}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-slate-900">管理页</span>
            </div>
            <p className="eyebrow mt-4">圈主管理</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              先把资料、规则和基础角色关系管顺，圈内治理再继续往下接。
            </h1>
            <p className="mt-4 text-sm leading-8 text-slate-600">
              {getActorLabel(accessContext.actorLabel)} 当前先开放圈子资料维护和圈管关系入口，帖子置顶、圈内删帖、禁言和举报处理会在后续步骤接入。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/circles/${accessContext.circle.slug}`} variant="secondary">
              返回圈子详情
            </ButtonLink>
            {accessContext.actorLabel === "SUPER_ADMIN" ? (
              <ButtonLink href="/admin/circles" variant="ghost">
                后台圈子总表
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </div>

      {feedback ? (
        <div className={`rounded-[1.5rem] border px-5 py-4 ${feedback.className}`}>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-2 text-sm leading-7">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <SurfaceCard className="h-full">
          <p className="text-sm text-slate-500">关注人数</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {accessContext.circle.followersCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">当前圈子的基础关注规模。</p>
        </SurfaceCard>

        <SurfaceCard className="h-full">
          <p className="text-sm text-slate-500">帖子数量</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {accessContext.circle.postsCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">Step 6 会把这里对应的内容流能力补齐。</p>
        </SurfaceCard>

        <SurfaceCard className="h-full">
          <p className="text-sm text-slate-500">当前模式</p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
            {accessContext.circle.allowAnonymous ? "已开启匿名发言" : "匿名发言关闭"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            分类：{accessContext.circle.category.name} · 圈主：{ownerName}
          </p>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.85fr)]">
        <SurfaceCard>
          <p className="eyebrow">资料维护</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            维护圈子基础资料、圈规和公告
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            slug、简介、规则、公告和匿名设置都会直接影响前台详情展示。这里先把 Step 5 必要信息都落下来。
          </p>
          <div className="mt-6">
            <CircleSettingsForm
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name
              }))}
              values={{
                id: accessContext.circle.id,
                categoryId: accessContext.circle.categoryId,
                name: accessContext.circle.name,
                slug: accessContext.circle.slug,
                coverUrl: accessContext.circle.coverUrl,
                iconUrl: accessContext.circle.iconUrl,
                intro: accessContext.circle.intro ?? "",
                rules: accessContext.circle.rules ?? "",
                announcement: accessContext.circle.announcement ?? "",
                allowAnonymous: accessContext.circle.allowAnonymous
              }}
            />
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="h-fit">
            <p className="eyebrow">圈内角色</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  圈主
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">{ownerName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  默认拥有资料维护、圈管维护和后续治理权限。
                </p>
              </div>

              {managerList.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                  当前还没有额外圈管。可以先让圈主独立运营，等圈子开始活跃后再逐步补人手。
                </div>
              ) : (
                managerList.map((manager) => (
                  <div
                    className="rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-4"
                    key={manager.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                          圈管
                        </p>
                        <p className="mt-2 text-base font-semibold text-slate-950">
                          {manager.user.profile?.nickname ?? manager.user.username}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">@{manager.user.username}</p>
                      </div>

                      {accessContext.canManageManagers ? (
                        <form action={removeCircleManagerAction}>
                          <input name="circleId" type="hidden" value={accessContext.circle.id} />
                          <input name="relationId" type="hidden" value={manager.id} />
                          <input name="returnTo" type="hidden" value={returnTo} />
                          <Button type="submit" variant="secondary">
                            移除圈管
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard className="h-fit">
            <p className="eyebrow">圈管维护</p>
            {accessContext.canManageManagers ? (
              <form action={addCircleManagerAction} className="mt-5 space-y-4">
                <input name="circleId" type="hidden" value={accessContext.circle.id} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">添加圈管用户名</span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-accent)]"
                    name="username"
                    placeholder="输入已激活账号的用户名"
                    type="text"
                  />
                </label>
                <Button type="submit">添加圈管</Button>
              </form>
            ) : (
              <div className="mt-5 rounded-[1.15rem] border border-dashed border-black/10 bg-white/72 px-4 py-5 text-sm leading-7 text-slate-600">
                当前账号可以维护圈子资料，但只有圈主或超级管理员可以变更圈管名单。
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="h-fit bg-[linear-gradient(155deg,rgba(255,255,255,0.94),rgba(23,107,108,0.08))]">
            <p className="eyebrow">后续治理</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>帖子置顶、删帖和圈内公告流会在 Step 6 结合帖子系统一起接入。</li>
              <li>圈内举报处理、禁言和更完整的操作日志会在 Step 9 与 Step 10 继续补齐。</li>
              <li>这一页目前先承担圈子资料维护和角色入口，不会假装已经具备完整治理闭环。</li>
            </ul>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
