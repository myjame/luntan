import { ProfileForm } from "@/modules/auth/components/profile-form";
import { requireActiveUser } from "@/modules/auth/lib/guards";

export default async function SettingsPage() {
  const user = await requireActiveUser();

  return (
    <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
      <div className="surface-card h-fit">
        <p className="eyebrow">账号设置</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          身份资料和私信边界都在这里维护。
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          当前已经支持昵称、头像、简介和私信权限设置，后续会继续补更多隐私偏好项。
        </p>
      </div>

      <div className="surface-card">
        <ProfileForm
          avatarUrl={user.profile?.avatarUrl ?? ""}
          bio={user.profile?.bio ?? ""}
          directMessagePermission={user.settings?.directMessagePermission ?? "FOLLOWING_ONLY"}
          nickname={user.profile?.nickname ?? user.username}
        />
      </div>
    </div>
  );
}
