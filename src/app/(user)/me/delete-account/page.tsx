import { DeleteAccountForm } from "@/modules/auth/components/delete-account-form";
import { requireActiveUser } from "@/modules/auth/lib/guards";

export default async function DeleteAccountPage() {
  await requireActiveUser();

  return (
    <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
      <div className="surface-card h-fit">
        <p className="eyebrow">注销申请</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">注销不是硬删除，而是审核后执行脱敏。</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          历史内容会按平台规则保留并做脱敏处理。提交申请后，账号状态会变为待注销，当前会话也会被退出。
        </p>
      </div>

      <div className="surface-card">
        <DeleteAccountForm />
      </div>
    </div>
  );
}
