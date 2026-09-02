"use server";

import { redirect } from "next/navigation";
import { acceptInviteWithCode, requestInviteCode } from "@/lib/auth";
import { getInvitation } from "@/lib/data";

export interface InviteState {
  step: "start" | "code";
  error?: string;
  /** Prototype convenience: no email is sent, so the code is shown on screen. */
  devCode?: string;
}

export async function sendInviteCode(invitationId: string): Promise<InviteState> {
  const inv = await getInvitation(invitationId);
  if (!inv || inv.status !== "pending") return { step: "start", error: "This invitation is no longer valid." };

  const res = await requestInviteCode(invitationId);
  if (!res.ok) return { step: "start", error: res.error ?? "This invitation is no longer valid." };
  console.log(`[auth] invite code for ${inv.email}: ${res.devCode}`);
  return { step: "code", devCode: res.devCode };
}

export async function acceptWithCode(invitationId: string, formData: FormData): Promise<InviteState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) return { step: "code", error: "Enter the 6-digit code." };

  const res = await acceptInviteWithCode(invitationId, code);
  if (!res.ok) return { step: "code", error: res.error ?? "That code is invalid or has expired." };

  redirect(res.redirectTo ?? "/dashboard");
}
