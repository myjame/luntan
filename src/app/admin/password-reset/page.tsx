import { AdminBreadcrumbs } from "@/components/layout/admin-breadcrumbs";
import { AdminPasswordResetForm } from "@/modules/auth/components/admin-password-reset-form";
import { requireSuperAdmin } from "@/modules/auth/lib/guards";

export default async function AdminPasswordResetPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-6 pt-2">
      <AdminBreadcrumbs
        items={[
          { label: "后台首页", href: "/admin" },
          { label: "密码重置" }
        ]}
      />

      <div className="rounded-[2rem] border border-black/8 bg-[rgba(255,251,246,0.92)] p-8 shadow-[0_24px_60px_rgba(24,32,45,0.08)]">
        <p className="eyebrow">管理员工具</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">管理员重置密码</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          首版不做邮箱自助找回，因此后台需要提供一个安全、明确的密码重置入口。当前只允许超级管理员进入此页面。
        </p>
      </div>

      <div className="surface-card max-w-2xl">
        <AdminPasswordResetForm />
      </div>
    </div>
  );
}
