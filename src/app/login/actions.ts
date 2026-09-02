"use server";

import { redirect } from "next/navigation";
import {
  clearSession,
  homePathForRole,
  requestLoginCode,
  signInWithLoginCode,
} from "@/lib/auth";

export interface LoginState {
  step: "email" | "code";
  email?: string;
  error?: string;
  /** Prototype convenience: no email is sent, so the code is shown on screen. */
  devCode?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(value: FormDataEntryValue | null): string | null {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export async function requestCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { step: "email", error: "Enter a valid email address." };
  }

  const res = await requestLoginCode(email);
  if (!res.ok) return { step: "email", error: res.error ?? "Could not send a code." };
  console.log(`[auth] login code for ${email}: ${res.devCode}`);

  return { step: "code", email, devCode: res.devCode };
}

export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!EMAIL_RE.test(email)) return { step: "email", error: "Enter a valid email address." };
  if (!/^\d{6}$/.test(code)) return { step: "code", email, error: "Enter the 6-digit code." };

  const res = await signInWithLoginCode(email, code, next);
  if (!res.ok) return { step: "code", email, error: res.error ?? "That code is invalid or has expired." };

  redirect(res.redirectTo ?? homePathForRole("buyer"));
}

export async function signOut(): Promise<void> {
  await clearSession();
  redirect("/login");
}
