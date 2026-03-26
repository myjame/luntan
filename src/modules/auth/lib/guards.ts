import "server-only";

import { cache } from "react";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { UserStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { getSession } from "@/modules/auth/lib/session";

function toStatusRedirect(status: UserStatus) {
  return `/account-status?status=${status}`;
}

export const getCurrentUser = cache(async () => {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      profile: true,
      settings: true
    }
  });
});

export async function requireActiveUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login" as Route);
  }

  if (user.status !== UserStatus.ACTIVE) {
    redirect(toStatusRedirect(user.status) as Route);
  }

  return user;
}

export async function requireSuperAdmin() {
  const user = await requireActiveUser();

  if (user.role !== "SUPER_ADMIN") {
    redirect("/account-status?status=ACTIVE" as Route);
  }

  return user;
}
