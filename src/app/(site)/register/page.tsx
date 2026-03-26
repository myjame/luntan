import { RegisterForm } from "@/modules/auth/components/register-form";
import { createCaptchaChallenge } from "@/modules/auth/lib/captcha";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const captcha = await createCaptchaChallenge();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <div className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow">注册申请</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">先提交资料，审核通过后再进入互动。</h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600">
          首版采用“注册后审核”的准入方式。完成注册后，账号会进入待审核状态，审核通过后才能登录、发帖、评论和私信。
        </p>
      </div>

      <div className="surface-card">
        <RegisterForm captchaQuestion={captcha.question} captchaToken={captcha.token} />
      </div>
    </div>
  );
}
