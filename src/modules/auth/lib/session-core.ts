import type { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

import {
  FALLBACK_SESSION_SECRET,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS
} from "@/modules/auth/lib/constants";
import type { SessionPayload } from "@/modules/auth/lib/types";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET ?? FALLBACK_SESSION_SECRET;

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());

    return {
      userId: String(payload.userId),
      username: String(payload.username),
      role: String(payload.role) as SessionPayload["role"],
      status: String(payload.status) as SessionPayload["status"],
      nickname: payload.nickname ? String(payload.nickname) : null
    } satisfies SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
