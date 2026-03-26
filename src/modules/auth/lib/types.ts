export const authUserStatuses = [
  "PENDING_REVIEW",
  "ACTIVE",
  "REJECTED",
  "MUTED",
  "BANNED",
  "DISABLED",
  "PENDING_DELETION"
] as const;

export const authUserRoles = ["USER", "SUPER_ADMIN"] as const;

export type AuthUserStatus = (typeof authUserStatuses)[number];
export type AuthUserRole = (typeof authUserRoles)[number];

export type SessionPayload = {
  userId: string;
  username: string;
  role: AuthUserRole;
  status: AuthUserStatus;
  nickname?: string | null;
};

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialActionState: ActionState = {
  ok: false
};
