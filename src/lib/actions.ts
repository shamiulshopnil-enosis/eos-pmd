"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, apiUpload } from "./api-client";
import { acceptInvitationSignedIn } from "./auth";
import { getProject } from "./data";

type NewPerson = { id: string; email: string; name: string | null };

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

// ---------------------------------------------------------------------------
// Milestones (Milestones plan, Phase 2 — spec §6.2, §6.3, §5.3)
// ---------------------------------------------------------------------------

/** Pull real, non-empty File entries out of a FormData field. */
function filesFrom(formData: FormData, field = "files"): File[] {
  return formData
    .getAll(field)
    .filter((f): f is File => typeof f === "object" && f instanceof File && f.size > 0);
}

async function uploadAttachments(milestoneId: string, files: File[]): Promise<void> {
  if (files.length === 0) return;
  const up = new FormData();
  for (const f of files) up.append("files", f);
  await apiUpload(`/milestones/${milestoneId}/attachments`, up);
}

export async function createMilestone(projectId: string, formData: FormData) {
  const files = filesFrom(formData);
  const body = formToObject(formData);
  delete body.files;
  const { milestoneId } = await post<{ milestoneId: string }>("/milestones", { ...body, projectId });
  await uploadAttachments(milestoneId, files);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/milestones");
  redirect(`/projects/${projectId}/milestones/${milestoneId}`);
}

export async function uploadMilestoneAttachments(
  projectId: string,
  milestoneId: string,
  formData: FormData,
) {
  await uploadAttachments(milestoneId, filesFrom(formData));
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function removeMilestoneAttachment(
  projectId: string,
  milestoneId: string,
  attachmentId: string,
) {
  await del(`/milestones/${milestoneId}/attachments/${attachmentId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
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
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
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

/**
 * Client rejects a milestone that is with them for review. Needs `reason`;
 * `notifyAssignees` + `message` optionally email the milestone assignees.
 */
export async function rejectMilestone(projectId: string, milestoneId: string, formData: FormData) {
  await post(`/milestones/${milestoneId}/reject`, formToObject(formData));
  revalidateReview(projectId, milestoneId);
}

// ---------------------------------------------------------------------------
// Completion (Milestones plan, Phase 6 — spec §5.2, §6.8)
// ---------------------------------------------------------------------------

function revalidateCompletion(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
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
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/capstone`);
}

export async function requestCapstone(projectId: string) {
  await post(`/projects/${projectId}/request-capstone`);
  revalidateCapstone(projectId);
}

export async function submitCapstone(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/submit-capstone`, formToObject(formData));
  revalidateCapstone(projectId);
  redirect(`/projects/${projectId}`);
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
// Companies, members (company-unification)
// ---------------------------------------------------------------------------

export async function addCompanyMember(companyId: string, formData: FormData) {
  await post(`/companies/${companyId}/members`, formToObject(formData));
  revalidatePath("/team");
}

export async function updateCompanyMember(companyId: string, membershipId: string, formData: FormData) {
  await patch(`/companies/${companyId}/members/${membershipId}`, formToObject(formData));
  revalidatePath("/team");
}

export async function removeCompanyMember(companyId: string, membershipId: string) {
  await del(`/companies/${companyId}/members/${membershipId}`);
  revalidatePath("/team");
}

/** Replace the delivering-company people assigned to a project. */
export async function setProjectStaffing(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/delivery-staffing`, formToObject(formData));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/team`);
}

/** Replace the receiving-company people assigned to a project's review side. */
export async function setReviewStaffing(projectId: string, formData: FormData) {
  await post(`/projects/${projectId}/review-staffing`, formToObject(formData));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/team`);
}

/**
 * Add a brand-new person to the delivering company and staff them on this
 * project's delivery side, in one step. Used by the milestone assignee
 * picker's "add someone new" affordance. Returns the created person so the
 * caller can select them immediately.
 */
export async function addProjectDeliveryPerson(
  projectId: string,
  input: { name?: string; email: string },
): Promise<NewPerson> {
  const project = await getProject(projectId);
  if (!project?.deliveringCompanyId) throw new Error("Project not found.");
  const created = await post<NewPerson>(`/companies/${project.deliveringCompanyId}/members`, {
    name: input.name?.trim() ?? "",
    email: input.email.trim(),
    role: "member",
  });
  const next = Array.from(new Set([...(project.assignedMemberIds ?? []), created.id]));
  await post(`/projects/${projectId}/delivery-staffing`, { memberIds: next });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/team`);
  revalidatePath(`/projects/${projectId}/milestones/new`);
  return { id: created.id, email: created.email, name: created.name };
}

/**
 * Add a brand-new person to a company's directory (used by the project People
 * page staffing pickers' "add someone new"). Returns the created person; the
 * surrounding form still persists the actual assignment on Save.
 */
export async function addCompanyPerson(
  companyId: string,
  input: { name?: string; email: string },
): Promise<NewPerson> {
  const created = await post<NewPerson>(`/companies/${companyId}/members`, {
    name: input.name?.trim() ?? "",
    email: input.email.trim(),
    role: "member",
  });
  revalidatePath("/team");
  return { id: created.id, email: created.email, name: created.name };
}

/** Accept an invitation as the already-signed-in matching user. */
export async function acceptInvitation(invitationId: string) {
  const res = await acceptInvitationSignedIn(invitationId);
  if (!res.ok) throw new Error(res.error ?? "This invitation is no longer valid.");
  revalidatePath("/projects");
  if (res.redirectTo) {
    revalidatePath(res.redirectTo);
    redirect(res.redirectTo);
  }
}
