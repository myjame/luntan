import type { AuthUserStatus } from "@/modules/auth/lib/types";
import { authStatusMeta } from "@/modules/auth/lib/constants";

export function getStatusMeta(status: AuthUserStatus) {
  return authStatusMeta[status];
}
