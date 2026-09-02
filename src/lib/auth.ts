import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "./api-client";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  homePathForRole,
  verifySessionToken,
  type SessionUser,
  type UserRole,
} from "./session";

export { homePathForRole } from "./session";
export type { SessionUser, UserRole } from "./session";

// Auth now lives in the NestJS API (see ../../api/src/auth). This module keeps
// only what belongs to Next.js: the `eos_session` cookie and local JWT
// verification (shared AUTH_SECRET, no DB round-trip — middleware relies on it).

// ---------------------------------------------------------------------------
// cookie / session
// ---------------------------------------------------------------------------

/** Persist a session token the API already signed. */
export async function issueSessionToken(token: string): Promise<void> {
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

// ---------------------------------------------------------------------------
// API-backed flows (one-time email codes, invitation acceptance)
// ---------------------------------------------------------------------------

type CodeResponse = { ok: boolean; error?: string; devCode?: string; email?: string };
type SignInResponse = {
  ok: boolean;
  error?: string;
  token?: string;
  redirectTo?: string;
};

/** Ask the API to mint a one-time login code (returned in dev, no email sent). */
export async function requestLoginCode(email: string): Promise<CodeResponse> {
  return apiFetch<CodeResponse>("/auth/login/request-code", {
    method: "POST",
    body: { email },
  });
}

/** Verify a login code; on success sets the session cookie and returns where to go. */
export async function signInWithLoginCode(
  email: string,
  code: string,
  next?: string | null,
): Promise<SignInResponse> {
  const res = await apiFetch<SignInResponse>("/auth/login/verify-code", {
    method: "POST",
    body: { email, code, next: next ?? undefined },
  });
  if (res.ok && res.token) await issueSessionToken(res.token);
  return res;
}

export async function requestInviteCode(invitationId: string): Promise<CodeResponse> {
  return apiFetch<CodeResponse>(`/auth/invite/${invitationId}/request-code`, { method: "POST" });
}

/** Sign-in-and-accept: verify the invite code, set the cookie, return the redirect. */
export async function acceptInviteWithCode(
  invitationId: string,
  code: string,
): Promise<SignInResponse> {
  const res = await apiFetch<SignInResponse>(`/auth/invite/${invitationId}/accept`, {
    method: "POST",
    body: { code },
  });
  if (res.ok && res.token) await issueSessionToken(res.token);
  return res;
}

/** Accept an invitation as the already-signed-in matching user; refreshes the cookie. */
export async function acceptInvitationSignedIn(invitationId: string): Promise<SignInResponse> {
  const res = await apiFetch<SignInResponse>(`/auth/invitations/${invitationId}/accept`, {
    method: "POST",
  });
  if (res.ok && res.token) await issueSessionToken(res.token);
  return res;
}
