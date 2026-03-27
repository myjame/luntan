import { NextRequest, NextResponse } from "next/server";

import { UserStatus } from "@/generated/prisma/client";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import {
  getUnreadNotificationCount,
  listNotifications
} from "@/modules/notifications/lib/service";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "请先登录。"
      },
      { status: 401 }
    );
  }

  if (user.status !== UserStatus.ACTIVE) {
    return NextResponse.json(
      {
        message: "当前账号状态不可访问通知接口。"
      },
      { status: 403 }
    );
  }

  const takeParam = Number(request.nextUrl.searchParams.get("take") ?? "10");
  const take = Number.isFinite(takeParam) ? takeParam : 10;
  const [unreadCount, notifications] = await Promise.all([
    getUnreadNotificationCount(user.id),
    listNotifications(user.id, take)
  ]);

  return NextResponse.json({
    unreadCount,
    notifications
  });
}
