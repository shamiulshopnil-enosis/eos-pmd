import { SignJWT, jwtVerify } from "jose";

// Edge-safe session primitives (JWT sign/verify only, no next/headers, no Mongo)
// so this module can be imported from middleware.ts. Server-only helpers that
// read cookies or the database live in ./auth.

// Company-model unification PR3: everyone is a "member" of the one unified workspace;
// "admin" is the only special role (platform admin).
export type UserRole = "admin" | "member";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export const SESSION_COOKIE = "eos_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function homePathForRole(role: UserRole | string): string {
  return role === "admin" ? "/admin" : "/dashboard";
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set. Add it to .env and the Vercel project env vars.");
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
    // Stale tokens may still carry "buyer" / "vendor" — treat anything but
    // "admin" as a plain member.
    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: (payload.name as string | null) ?? null,
      role: payload.role === "admin" ? "admin" : "member",
    };
  } catch {
    return null;
  }
}
