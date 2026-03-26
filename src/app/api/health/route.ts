import { NextResponse } from "next/server";

import { appConfig } from "@/server/config/app-config";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: appConfig.siteName,
    timestamp: new Date().toISOString()
  });
}
