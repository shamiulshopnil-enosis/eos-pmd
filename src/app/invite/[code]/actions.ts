"use server";

import { redirect } from "next/navigation";
import { createLoginCode, findOrCreateUser, issueSession, verifyLoginCode } from "@/lib/auth";
import { getInvitation } from "@/lib/data";
import { applyInvitationAcceptance } from "@/lib/invitations";

export interface InviteState {
  step: "start" | "code";
  error?: string;
  /** Prototype convenience: no email is sent, so the code is shown on screen. */
  devCode?: string;
}

export async function sendInviteCode(invitationId: string): Promise<InviteState> {
  const inv = await getInvitation(invitationId);
  if (!inv || inv.status !== "pending") return { step: "start", error: "This invitation is no longer valid." };

  const code = await createLoginCode(inv.email, "invite");
  console.log(`[auth] invite code for ${inv.email}: ${code}`);
  return { step: "code", devCode: code };
}

export async function acceptWithCode(invitationId: string, formData: FormData): Promise<InviteState> {
  const inv = await getInvitation(invitationId);
  if (!inv || inv.status !== "pending") return { step: "start", error: "This invitation is no longer valid." };

  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) return { step: "code", error: "Enter the 6-digit code." };

  const ok = await verifyLoginCode(inv.email, code, "invite");
  if (!ok) return { step: "code", error: "That code is invalid or has expired." };

  const user = await findOrCreateUser(inv.email, inv.kind === "vendor_team" ? "vendor" : "buyer");
  const result = await applyInvitationAcceptance(invitationId, user);
  if (!result.ok) return { step: "code", error: result.error };

  await issueSession(result.sessionUser);
  redirect(result.redirectTo);
}
