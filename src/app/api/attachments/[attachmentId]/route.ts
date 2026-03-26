import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { UserStatus } from "@/generated/prisma/client";
import { getSession } from "@/modules/auth/lib/session";
import { prisma } from "@/server/db/prisma";
import { appConfig } from "@/server/config/app-config";

export async function GET(
  _: NextRequest,
  context: {
    params: Promise<{
      attachmentId?: string | string[];
    }>;
  }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      {
        message: "请先登录后下载附件。"
      },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId
    },
    select: {
      status: true
    }
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    return NextResponse.json(
      {
        message: "当前账号状态不可下载附件。"
      },
      { status: 403 }
    );
  }

  const { attachmentId } = await context.params;

  if (typeof attachmentId !== "string" || attachmentId.trim().length === 0) {
    return NextResponse.json(
      {
        message: "附件标识无效。"
      },
      { status: 400 }
    );
  }

  const attachment = await prisma.postAttachment.findUnique({
    where: {
      id: attachmentId
    },
    select: {
      originalName: true,
      mimeType: true,
      storagePath: true,
      post: {
        select: {
          deletedAt: true,
          status: true,
          circle: {
            select: {
              deletedAt: true,
              status: true
            }
          }
        }
      }
    }
  });

  if (
    !attachment ||
    attachment.post.deletedAt ||
    attachment.post.status !== "PUBLISHED" ||
    attachment.post.circle.deletedAt ||
    attachment.post.circle.status !== "ACTIVE"
  ) {
    return NextResponse.json(
      {
        message: "附件不存在或已不可访问。"
      },
      { status: 404 }
    );
  }

  try {
    const fileBuffer = await readFile(path.resolve(appConfig.uploadDir, attachment.storagePath));

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json(
      {
        message: "附件文件不存在。"
      },
      { status: 404 }
    );
  }
}
