import { createHash, randomInt } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase } from "./mongoose";
import { LoginCodeModel, UserModel } from "./models";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  homePathForRole,
  signSession,
  verifySessionToken,
  type SessionUser,
  type UserRole,
} from "./session";

export { homePathForRole } from "./session";
export type { SessionUser, UserRole } from "./session";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(email: string, code: string): string {
  return createHash("sha256").update(`${normalizeEmail(email)}:${code}:${process.env.AUTH_SECRET ?? ""}`).digest("hex");
}

/**
 * Create a one-time login code for an email. Returns the plaintext code so the
 * caller can surface it (shown on screen + server log in this prototype - no
 * email is sent).
 */
export async function createLoginCode(email: string, purpose: "login" | "invite" = "login"): Promise<string> {
  await connectToDatabase();
  const normalized = normalizeEmail(email);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  await LoginCodeModel.create({
    email: normalized,
    codeHash: hashCode(normalized, code),
    purpose,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  return code;
}

/** Verify and consume a login code. One-time use, 15-minute expiry. */
export async function verifyLoginCode(
  email: string,
  code: string,
  purpose: "login" | "invite" = "login",
): Promise<boolean> {
  await connectToDatabase();
  const normalized = normalizeEmail(email);

  const record = await LoginCodeModel.findOne({
    email: normalized,
    purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record) return false;
  if (record.codeHash !== hashCode(normalized, code.trim())) return false;

  record.consumedAt = new Date();
  await record.save();
  return true;
}

/** Find an existing account by email or create a fresh one. One account per verified email. */
export async function findOrCreateUser(email: string, role: UserRole = "buyer"): Promise<SessionUser> {
  await connectToDatabase();
  const normalized = normalizeEmail(email);

  const user = await UserModel.findOneAndUpdate(
    { email: normalized },
    { $setOnInsert: { email: normalized, role }, $set: { emailVerified: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { id: String(user!._id), email: user!.email, name: user!.name ?? null, role: user!.role as UserRole };
}

export async function issueSession(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Require a signed-in user. Redirects to /login when signed out. When `role` is
 * given and does not match, redirects the user to their own home area.
 */
export async function requireUser(role?: UserRole): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(homePathForRole(user.role));
  return user;
}
