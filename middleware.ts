import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSessionFromRequest } from "@/modules/auth/lib/session-core";

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("redirectTo", request.nextUrl.pathname);

  return NextResponse.redirect(url);
}

function statusRedirect(request: NextRequest, status: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/account-status";
  url.searchParams.set("status", status);

  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromRequest(request);

  if (pathname.startsWith("/me")) {
    if (!session) {
      return loginRedirect(request);
    }

    if (session.status !== "ACTIVE") {
      return statusRedirect(request, session.status);
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!session) {
      return loginRedirect(request);
    }

    if (session.status !== "ACTIVE") {
      return statusRedirect(request, session.status);
    }

    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/me/:path*", "/admin/:path*"]
};
