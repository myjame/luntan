import { randomInt } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

import { FALLBACK_SESSION_SECRET } from "@/modules/auth/lib/constants";

function getCaptchaSecret() {
  const secret = process.env.SESSION_SECRET ?? FALLBACK_SESSION_SECRET;

  return new TextEncoder().encode(secret);
}

export async function createCaptchaChallenge() {
  const left = randomInt(1, 10);
  const right = randomInt(1, 10);
  const answer = String(left + right);

  const token = await new SignJWT({
    left,
    right,
    answer,
    kind: "register-captcha"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getCaptchaSecret());

  return {
    question: `${left} + ${right} = ?`,
    token
  };
}

export async function verifyCaptchaChallenge(token: string, value: string) {
  try {
    const { payload } = await jwtVerify(token, getCaptchaSecret());

    return payload.kind === "register-captcha" && String(payload.answer) === value.trim();
  } catch {
    return false;
  }
}
