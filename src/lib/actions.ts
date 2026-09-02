"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "./api-client";
import { acceptInvitationSignedIn } from "./auth";

// Mutations. The permission checks, validation and database writes now live in
// the NestJS API (see ../../api/src/projects and .../milestones). Each action
// forwards the form to the API, then does the Next.js-only work: revalidate the
// affected routes and redirect.

// ---------------------------------------------------------------------------
// form-data helpers
// ---------------------------------------------------------------------------

/** Flatten a FormData into a plain object, collecting repeated keys into arrays. */
function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key).map((v) => (typeof v === "string" ? v : ""));
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

const post = <T = unknown>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: "POST", body: body ?? {} });
const patch = <T = unknown>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: "PATCH", body: body ?? {} });
const del = <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Projects (PRD §5, §6)
// ---------------------------------------------------------------------------

export async function createProject(formData: FormData) {
  const { id } = await post<{ id: string }>("/projects", formToObject(formData));
  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  await patch(`/projects/${projectId}`, formToObject(formData));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

// --- Admin approval lifecycle (Milestones plan, Phase 1 — spec §5.1, §9) ---

export async function submitForApproval(projectId: string) {
  await post(`/projects/${projectId}/submit-for-approval`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
}

export async function approveProject(projectId: string) {
  await post(`/projects/${projectId}/approve`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function rejectProject(projectId: string) {
  await post(`/projects/${projectId}/reject`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function setProjectStatus(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/status`, formToObject(formData));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Milestones (Milestones plan, Phase 2 — spec §6.2, §6.3, §5.3)
// ---------------------------------------------------------------------------

export async function createMilestone(projectId: string, formData: FormData) {
  const { milestoneId } = await post<{ milestoneId: string }>("/milestones", {
    ...formToObject(formData),
    projectId,
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/milestones");
  redirect(`/projects/${projectId}/milestones/${milestoneId}`);
}

export async function updateMilestone(projectId: string, milestoneId: string, formData: FormData) {
  await patch(`/milestones/${milestoneId}`, formToObject(formData));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath("/milestones");
  redirect(`/projects/${projectId}/milestones/${milestoneId}`);
}

export async function deleteMilestone(projectId: string, milestoneId: string) {
  await del(`/milestones/${milestoneId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/milestones");
  redirect(`/projects/${projectId}`);
}

/** Move a draft milestone to the client for review. One milestone per project at a time (spec §5.3). */
export async function sendMilestoneForReview(projectId: string, milestoneId: string) {
  await post(`/milestones/${milestoneId}/send`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath("/milestones");
  revalidatePath("/dashboard");
}

/** Pull a milestone back from the client before it has been reviewed. */
export async function reopenMilestone(projectId: string, milestoneId: string) {
  await post(`/milestones/${milestoneId}/reopen`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath("/milestones");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Client milestone rating (Milestones plan, Phase 4 — spec §6.4, §6.5)
// ---------------------------------------------------------------------------

function revalidateReview(projectId: string, milestoneId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath(`/my-projects/${projectId}`);
  revalidatePath("/my-projects");
  revalidatePath("/milestones");
  revalidatePath("/dashboard");
}

export async function submitMilestoneRating(projectId: string, milestoneId: string, formData: FormData) {
  await post(`/milestones/${milestoneId}/rating`, formToObject(formData));
  revalidateReview(projectId, milestoneId);
}

export async function editOwnMilestoneRating(projectId: string, milestoneId: string, formData: FormData) {
  await post(`/milestones/${milestoneId}/rating/edit`, formToObject(formData));
  revalidateReview(projectId, milestoneId);
}

export async function requestRatingReconsideration(projectId: string, milestoneId: string) {
  await post(`/milestones/${milestoneId}/request-reconsideration`);
  revalidateReview(projectId, milestoneId);
}

// ---------------------------------------------------------------------------
// Completion (Milestones plan, Phase 6 — spec §5.2, §6.8)
// ---------------------------------------------------------------------------

function revalidateCompletion(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/my-projects/${projectId}`);
  revalidatePath("/my-projects");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/admin/projects");
}

export async function requestCompletion(projectId: string) {
  await post(`/projects/${projectId}/request-completion`);
  revalidateCompletion(projectId);
}

export async function confirmCompletion(projectId: string) {
  await post(`/projects/${projectId}/confirm-completion`);
  revalidateCompletion(projectId);
}

export async function forceCompleteProject(projectId: string) {
  await post(`/projects/${projectId}/force-complete`);
  revalidateCompletion(projectId);
  revalidatePath(`/admin/projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Capstone endorsement (Milestones plan, Phase 7 — spec §4.5, §6.9)
// ---------------------------------------------------------------------------

function revalidateCapstone(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/public-preview`);
  revalidatePath(`/projects/${projectId}/publish`);
  revalidatePath(`/my-projects/${projectId}`);
  revalidatePath(`/my-projects/${projectId}/capstone`);
}

export async function requestCapstone(projectId: string) {
  await post(`/projects/${projectId}/request-capstone`);
  revalidateCapstone(projectId);
}

export async function submitCapstone(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/submit-capstone`, formToObject(formData));
  revalidateCapstone(projectId);
  redirect(`/my-projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Publication (PRD §18-21)
// ---------------------------------------------------------------------------

export async function publishProject(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/publish`, formToObject(formData));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}/public-preview`);
}

export async function unpublishProject(projectId: string) {
  await post(`/projects/${projectId}/unpublish`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

// ---------------------------------------------------------------------------
// People & invitations (Milestones plan, Phase 3 — spec §4.3, §4.4, §7, §8)
// ---------------------------------------------------------------------------

export async function inviteVendorTeamMember(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/vendor-team`, formToObject(formData));
  revalidatePath(`/projects/${projectId}/team`);
}

export async function removeVendorTeamMember(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/vendor-team/remove`, formToObject(formData));
  revalidatePath(`/projects/${projectId}/team`);
}

export async function inviteClientContact(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/client-contacts`, formToObject(formData));
  revalidatePath(`/projects/${projectId}/team`);
}

export async function reassignPrimaryContact(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/client-contacts/reassign-primary`, formToObject(formData));
  revalidatePath(`/projects/${projectId}/team`);
  revalidatePath(`/my-projects/${projectId}/people`);
}

export async function inviteCollaborator(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/client-contacts/collaborator`, formToObject(formData));
  revalidatePath(`/projects/${projectId}/team`);
  revalidatePath(`/my-projects/${projectId}/people`);
}

export async function removeClientContact(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/client-contacts/remove`, formToObject(formData));
  revalidatePath(`/projects/${projectId}/team`);
  revalidatePath(`/my-projects/${projectId}/people`);
}

/** Accept an invitation as the already-signed-in matching user. */
export async function acceptInvitation(invitationId: string) {
  const res = await acceptInvitationSignedIn(invitationId);
  if (!res.ok) throw new Error(res.error ?? "This invitation is no longer valid.");
  revalidatePath("/my-projects");
  if (res.redirectTo) {
    revalidatePath(res.redirectTo);
    redirect(res.redirectTo);
  }
}
