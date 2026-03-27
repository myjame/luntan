import { ButtonLink } from "@/components/ui/button";

type SearchParams = Promise<{
  title?: string;
  message?: string;
}>;

function normalizeValue(value?: string, fallback?: string) {
  if (!value) {
    return fallback ?? "";
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : fallback ?? "";
}

export default async function EmptyStatePage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const title = normalizeValue(params.title, "当前还没有可展示的数据");
  const message = normalizeValue(
    params.message,
    "你可以先回到首页继续浏览，或者切换其他入口。后续有数据后，这里会自动更新。"
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow">空态页面</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-4 text-sm leading-8 text-slate-600">{message}</p>
      </div>

      <div className="surface-card">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/">返回首页</ButtonLink>
          <ButtonLink href="/discover" variant="secondary">
            去发现页
          </ButtonLink>
          <ButtonLink href="/square" variant="ghost">
            去广场
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
