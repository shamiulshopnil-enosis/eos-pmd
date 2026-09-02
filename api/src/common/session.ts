import { SignJWT, jwtVerify } from "jose";
import type { SessionUser, UserRole } from "./types";

// Ported from the Next.js app's src/lib/session.ts. The API signs and verifies
// the *same* session JWT the Next app uses, so AUTH_SECRET must match on both
// sides. The Next app keeps ownership of the cookie; it forwards the token to
// this API as `Authorization: Bearer <token>`.

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const ROLE_HOME: Record<UserRole, string> = {
  vendor: "/dashboard",
  buyer: "/my-projects",
  admin: "/admin",
};

export function homePathForRole(role: UserRole): string {
  return ROLE_HOME[role] ?? "/login";
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.role !== "string") return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: (payload.name as string | null) ?? null,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}
