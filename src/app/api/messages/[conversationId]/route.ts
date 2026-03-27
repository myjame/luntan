import { NextRequest, NextResponse } from "next/server";

import { UserStatus } from "@/generated/prisma/client";
import { getCurrentUser } from "@/modules/auth/lib/guards";
import { listConversationMessages } from "@/modules/messages/lib/service";

export async function GET(
  _: NextRequest,
  context: {
    params: Promise<{
      conversationId?: string | string[];
    }>;
  }
) {
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
        message: "当前账号状态不可访问私信接口。"
      },
      { status: 403 }
    );
  }

  const { conversationId } = await context.params;

  if (typeof conversationId !== "string" || !conversationId.trim()) {
    return NextResponse.json(
      {
        message: "会话标识无效。"
      },
      { status: 400 }
    );
  }

  const messages = await listConversationMessages(conversationId, user.id, 80);

  if (!messages) {
    return NextResponse.json(
      {
        message: "未找到对应会话。"
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    messages
  });
}
