import { LoginForm } from "@/modules/auth/components/login-form";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow">登录社区</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">公开内容可浏览，审核通过后再参与互动。</h1>
        <p className="mt-4 text-sm leading-8 text-slate-600">
          支持用户名或邮箱登录。未通过审核、禁言、封禁、待注销等状态会在登录后被拦截并给出明确提示。
        </p>
      </div>

      <div className="surface-card">
        <LoginForm redirectTo={params.redirectTo} />
      </div>
    </div>
  );
}
