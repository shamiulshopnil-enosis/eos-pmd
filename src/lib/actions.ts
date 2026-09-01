"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "./mongoose";
import { issueSession, requireUser } from "./auth";
import { getProject } from "./data";
import { applyInvitationAcceptance } from "./invitations";
import {
  assertPermission,
  canConfirmCompletion,
  canEditMilestone,
  canInviteCollaborator,
  canInviteTeammate,
  canManageProject,
  canRateMilestone,
  canRequestCapstone,
  canRequestCompletion,
  canSendMilestone,
  canSubmitCapstone,
} from "./permissions";
import { ActivityModel, InvitationModel, MilestoneModel, ProjectModel } from "./models";
import { sanitizeMilestoneHtml } from "./richtext";
import { runningAverage } from "./scoring";
import { CAPSTONE_ATTRIBUTE_POOL, MAX_CAPSTONE_ATTRIBUTES, tierForScore } from "./attributes";
import { COMPLETION_TIMEOUT_DAYS, minReviewThreshold, RATING_SELF_CORRECTION_HOURS } from "./constants";
import type { ActivityType, CapstoneTier, Project } from "./types";
import type { SessionUser } from "./session";

// ---------------------------------------------------------------------------
// form-data helpers
// ---------------------------------------------------------------------------

function str(fd: FormData, key: string): string {
  return (fd.get(key) as string | null)?.trim() ?? "";
}

function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

function optInt(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function optDate(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  return v === "" ? null : new Date(v);
}

async function logActivity(params: {
  projectId: string;
  milestoneId?: string | null;
  type: ActivityType;
  message: string;
}) {
  await ActivityModel.create({
    projectId: params.projectId,
    milestoneId: params.milestoneId ?? null,
    type: params.type,
    message: params.message,
  });
}

/**
 * Load the signed-in user + serialized project and enforce a per-project role
 * check (Milestones plan, Phase 3 — spec §7). Throws on failure.
 */
async function requirePermission(
  projectId: string,
  check: (u: SessionUser, p: Project) => boolean,
  message?: string,
): Promise<{ user: SessionUser; project: Project }> {
  const user = await requireUser();
  await connectToDatabase();
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");
  assertPermission(check(user, project), message);
  return { user, project };
}

/**
 * Keep the project's stored score fields in sync (Milestones plan, Phase 5 —
 * spec §6.6). Called after any change to the reviewed set or the milestone count.
 * `finalScore` is only touched at completion (Phase 6).
 */
async function recomputeProjectScore(projectId: string): Promise<void> {
  const milestones = await MilestoneModel.find({ projectId }).select("status rating").lean();
  const reviewed = milestones.filter((m) => m.status === "reviewed" && m.rating != null);
  await ProjectModel.updateOne(
    { _id: projectId },
    {
      $set: {
        liveScore: runningAverage(milestones),
        reviewedMilestoneCount: reviewed.length,
        minReviewThreshold: minReviewThreshold(milestones.length),
      },
    },
  );
}

/** After completion, a project's milestones and ratings are locked (spec §6.8). */
function assertActiveProject(project: Project): void {
  if (project.executionStatus === "completed") {
    throw new Error("This project is completed. Its milestones and ratings are locked.");
  }
}

// ---------------------------------------------------------------------------
// Projects (PRD §5, §6)
// ---------------------------------------------------------------------------

export async function createProject(formData: FormData) {
  const user = await requireUser("vendor");
  await connectToDatabase();

  const project = await ProjectModel.create({
    name: str(formData, "name"),
    clientCompanyName: str(formData, "clientCompanyName"),
    clientContactName: optStr(formData, "clientContactName"),
    clientEmail: str(formData, "clientEmail"),
    services: optStr(formData, "services"),
    description: optStr(formData, "description"),
    startDate: optDate(formData, "startDate"),
    expectedCompletionDate: optDate(formData, "expectedCompletionDate"),
    teamSize: optInt(formData, "teamSize"),
    engagementModel: optStr(formData, "engagementModel"),
    internalRef: optStr(formData, "internalRef"),
    projectUrl: optStr(formData, "projectUrl"),
    projectType: str(formData, "projectType") === "whole" ? "whole" : "milestone",
    // The creator is the founding vendor Owner (spec §7).
    vendorTeam: [
      { userId: user.id, email: user.email, name: user.name, role: "owner", invitePending: false },
    ],
  });

  const projectId = String(project._id);

  // Optional invites at creation (spec §6.1, §8).
  const teammateEmail = optStr(formData, "teammateEmail");
  if (teammateEmail) {
    const email = teammateEmail.toLowerCase();
    const role = str(formData, "teammateRole") === "owner" ? "owner" : "member";
    await InvitationModel.create({
      email,
      projectId,
      kind: "vendor_team",
      proposedRole: role,
      invitedByUserId: user.id,
    });
    project.vendorTeam.push({ userId: null, email, name: null, role, invitePending: true } as never);
  }

  const contactEmail = optStr(formData, "contactEmail");
  if (contactEmail) {
    const email = contactEmail.toLowerCase();
    const designation = optStr(formData, "contactDesignation") ?? "Client Contact";
    await InvitationModel.create({
      email,
      projectId,
      kind: "client_contact",
      proposedRole: "primary",
      designation,
      invitedByUserId: user.id,
    });
    project.clientContacts.push({
      userId: null,
      email,
      name: null,
      designation,
      role: "primary",
      invitePending: true,
    } as never);
  }

  if (teammateEmail || contactEmail) await project.save();

  // A Whole Project is a Milestone Project with exactly one milestone (spec §3).
  if (project.projectType === "whole") {
    await MilestoneModel.create({
      projectId,
      title: "Project delivery",
      description: "",
      targetDate: optDate(formData, "expectedCompletionDate"),
      status: "draft",
    });
  }
  await recomputeProjectScore(projectId);

  await logActivity({
    projectId,
    type: "PROJECT_CREATED",
    message: `Project "${project.name}" created for ${project.clientCompanyName}`,
  });

  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  await requirePermission(projectId, canManageProject, "Only a project owner can edit the project.");
  await connectToDatabase();

  // Whole-project edit lock: while its single milestone is with the client, the
  // shell is locked too (Milestones plan §6.3 / §10). Milestone Projects only lock
  // the individual milestone that was sent.
  const current = await ProjectModel.findById(projectId).select("projectType");
  if (current?.projectType === "whole") {
    const sent = await MilestoneModel.exists({ projectId, status: "sent" });
    if (sent) {
      throw new Error("This project is locked for editing while its milestone is with the client for review.");
    }
  }

  await ProjectModel.findByIdAndUpdate(projectId, {
    name: str(formData, "name"),
    clientCompanyName: str(formData, "clientCompanyName"),
    clientContactName: optStr(formData, "clientContactName"),
    clientEmail: str(formData, "clientEmail"),
    services: optStr(formData, "services"),
    description: optStr(formData, "description"),
    startDate: optDate(formData, "startDate"),
    expectedCompletionDate: optDate(formData, "expectedCompletionDate"),
    actualCompletionDate: optDate(formData, "actualCompletionDate"),
    teamSize: optInt(formData, "teamSize"),
    engagementModel: optStr(formData, "engagementModel"),
    internalRef: optStr(formData, "internalRef"),
    projectUrl: optStr(formData, "projectUrl"),
    status: str(formData, "status"),
  });

  // Editing an already-approved shell drops it back to "Edited" for admin re-approval
  // (Milestones plan §5.1). Public visibility is left untouched meanwhile.
  await ProjectModel.updateOne(
    { _id: projectId, adminStatus: "published" },
    { $set: { adminStatus: "edited" } },
  );

  await logActivity({ projectId, type: "PROJECT_UPDATED", message: `Project details updated` });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Admin approval lifecycle (Milestones plan, Phase 1 — spec §5.1, §9)
// ---------------------------------------------------------------------------

/** Vendor sends the project shell to the admin approval queue. */
export async function submitForApproval(projectId: string) {
  await requirePermission(projectId, canManageProject, "Only a project owner can submit for approval.");
  await connectToDatabase();
  await ProjectModel.findByIdAndUpdate(projectId, { adminStatus: "pending_approval" });
  await logActivity({ projectId, type: "PROJECT_UPDATED", message: "Submitted for admin approval" });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
}

export async function approveProject(projectId: string) {
  await requireUser("admin");
  await connectToDatabase();
  await ProjectModel.findByIdAndUpdate(projectId, { adminStatus: "published" });
  await logActivity({ projectId, type: "PROJECT_UPDATED", message: "Project shell approved by admin" });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function rejectProject(projectId: string) {
  await requireUser("admin");
  await connectToDatabase();
  await ProjectModel.findByIdAndUpdate(projectId, { adminStatus: "rejected" });
  await logActivity({ projectId, type: "PROJECT_UPDATED", message: "Project shell rejected by admin" });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function setProjectStatus(projectId: string, formData: FormData) {
  await requirePermission(projectId, canManageProject, "Only a project owner can change the project status.");
  await connectToDatabase();

  const status = str(formData, "status");
  await ProjectModel.findByIdAndUpdate(projectId, { status });
  await logActivity({
    projectId,
    type: status === "COMPLETED" ? "PROJECT_COMPLETED" : "PROJECT_UPDATED",
    message: `Project status changed to ${status.replace("_", " ")}`,
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Milestones (Milestones plan, Phase 2 — spec §6.2, §6.3, §5.3)
// ---------------------------------------------------------------------------

export async function createMilestone(projectId: string, formData: FormData) {
  const { project } = await requirePermission(projectId, canEditMilestone, "You are not a member of this project's vendor team.");
  assertActiveProject(project);
  await connectToDatabase();

  const milestone = await MilestoneModel.create({
    projectId,
    title: str(formData, "title"),
    description: sanitizeMilestoneHtml(str(formData, "description")),
    targetDate: optDate(formData, "targetDate"),
    status: "draft",
  });

  const milestoneId = String(milestone._id);
  await recomputeProjectScore(projectId);

  await logActivity({
    projectId,
    milestoneId,
    type: "RELEASE_CREATED",
    message: `Milestone "${milestone.title}" created`,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/milestones");
  redirect(`/projects/${projectId}/milestones/${milestoneId}`);
}

export async function updateMilestone(projectId: string, milestoneId: string, formData: FormData) {
  const { project } = await requirePermission(projectId, canEditMilestone, "You are not a member of this project's vendor team.");
  assertActiveProject(project);
  await connectToDatabase();

  const milestone = await MilestoneModel.findById(milestoneId);
  if (!milestone) throw new Error("Milestone not found.");
  if (milestone.status === "sent") {
    throw new Error("This milestone is locked for editing while it is with the client for review.");
  }

  milestone.title = str(formData, "title");
  milestone.description = sanitizeMilestoneHtml(str(formData, "description"));
  milestone.targetDate = optDate(formData, "targetDate");
  await milestone.save();

  await logActivity({ projectId, milestoneId, type: "RELEASE_UPDATED", message: `Milestone details updated` });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath("/milestones");
  redirect(`/projects/${projectId}/milestones/${milestoneId}`);
}

export async function deleteMilestone(projectId: string, milestoneId: string) {
  const { project } = await requirePermission(projectId, canEditMilestone, "You are not a member of this project's vendor team.");
  assertActiveProject(project);
  await connectToDatabase();

  const milestone = await MilestoneModel.findById(milestoneId);
  if (!milestone) throw new Error("Milestone not found.");
  if (milestone.status === "sent") {
    throw new Error("This milestone is locked while it is with the client for review.");
  }

  if (project.projectType === "whole") {
    throw new Error("A Whole Project must always keep its single milestone.");
  }

  await MilestoneModel.findByIdAndDelete(milestoneId);
  await recomputeProjectScore(projectId);
  await logActivity({ projectId, type: "RELEASE_UPDATED", message: `Milestone "${milestone.title}" removed` });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/milestones");
  redirect(`/projects/${projectId}`);
}

/** Move a draft milestone to the client for review. One milestone per project at a time (spec §5.3). */
export async function sendMilestoneForReview(projectId: string, milestoneId: string) {
  const { project } = await requirePermission(projectId, canSendMilestone, "You are not a member of this project's vendor team.");
  assertActiveProject(project);
  await connectToDatabase();

  const milestone = await MilestoneModel.findById(milestoneId);
  if (!milestone) throw new Error("Milestone not found.");
  if (milestone.status !== "draft") throw new Error("Only a draft milestone can be sent for review.");

  const sibling = await MilestoneModel.exists({
    projectId,
    status: "sent",
    _id: { $ne: milestoneId },
  });
  if (sibling) {
    throw new Error("Another milestone is already with the client. Wait for it to be reviewed first.");
  }

  milestone.status = "sent";
  milestone.sentAt = new Date();
  await milestone.save();

  await logActivity({
    projectId,
    milestoneId,
    type: "FEEDBACK_REQUESTED",
    message: `Sent "${milestone.title}" for client review`,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath("/milestones");
  revalidatePath("/dashboard");
}

/** Pull a milestone back from the client before it has been reviewed (mirrors "Cancel Endorsement Request"). */
export async function reopenMilestone(projectId: string, milestoneId: string) {
  const { project } = await requirePermission(projectId, canSendMilestone, "You are not a member of this project's vendor team.");
  assertActiveProject(project);
  await connectToDatabase();

  const milestone = await MilestoneModel.findById(milestoneId);
  if (!milestone) throw new Error("Milestone not found.");
  if (milestone.status === "reviewed") throw new Error("A reviewed milestone cannot be reopened.");
  if (milestone.status === "draft") return;

  milestone.status = "draft";
  milestone.sentAt = null;
  await milestone.save();

  await logActivity({
    projectId,
    milestoneId,
    type: "RELEASE_UPDATED",
    message: `Recalled "${milestone.title}" from client review`,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath("/milestones");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Client milestone rating (Milestones plan, Phase 4 — spec §6.4, §6.5)
// ---------------------------------------------------------------------------

function parseRating(formData: FormData): number {
  const n = Number.parseInt(String(formData.get("rating") ?? ""), 10);
  if (Number.isNaN(n) || n < 1 || n > 5) throw new Error("Please give a rating from 1 to 5.");
  return n;
}

function revalidateReview(projectId: string, milestoneId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones/${milestoneId}`);
  revalidatePath(`/my-projects/${projectId}`);
  revalidatePath("/my-projects");
  revalidatePath("/milestones");
  revalidatePath("/dashboard");
}

/** Primary Contact submits the one-and-only rating for the milestone that is with them. */
export async function submitMilestoneRating(projectId: string, milestoneId: string, formData: FormData) {
  const { project } = await requirePermission(projectId, canRateMilestone, "Only the primary client contact can rate milestones.");
  assertActiveProject(project);
  await connectToDatabase();

  const milestone = await MilestoneModel.findById(milestoneId);
  if (!milestone || String(milestone.projectId) !== projectId) throw new Error("Milestone not found.");
  if (milestone.status !== "sent") throw new Error("This milestone is not awaiting your review.");

  const rating = parseRating(formData);
  const now = new Date();
  milestone.rating = rating;
  milestone.comment = optStr(formData, "comment");
  milestone.status = "reviewed";
  milestone.ratingSubmittedAt = now;
  milestone.reviewedAt = now;
  await milestone.save();
  await recomputeProjectScore(projectId);

  await logActivity({
    projectId,
    milestoneId,
    type: "FEEDBACK_RECEIVED",
    message: `Client reviewed "${milestone.title}" (${rating}/5)`,
  });

  revalidateReview(projectId, milestoneId);
}

/**
 * Primary Contact edits their own rating: freely inside the self-correction
 * window, or any time after the vendor has requested a reconsideration.
 */
export async function editOwnMilestoneRating(projectId: string, milestoneId: string, formData: FormData) {
  const { project } = await requirePermission(projectId, canRateMilestone, "Only the primary client contact can edit this rating.");
  assertActiveProject(project);
  await connectToDatabase();

  const milestone = await MilestoneModel.findById(milestoneId);
  if (!milestone || String(milestone.projectId) !== projectId) throw new Error("Milestone not found.");
  if (milestone.status !== "reviewed") throw new Error("This milestone has not been reviewed yet.");

  const withinWindow =
    milestone.ratingSubmittedAt != null &&
    Date.now() - milestone.ratingSubmittedAt.getTime() <= RATING_SELF_CORRECTION_HOURS * 60 * 60 * 1000;
  if (!withinWindow && !milestone.editRequestedByVendor) {
    throw new Error("The window to change this rating has closed.");
  }

  const rating = parseRating(formData);
  milestone.rating = rating;
  milestone.comment = optStr(formData, "comment");
  await milestone.save();
  await recomputeProjectScore(projectId);

  await logActivity({
    projectId,
    milestoneId,
    type: "FEEDBACK_RECEIVED",
    message: `Client updated their rating for "${milestone.title}" (${rating}/5)`,
  });

  revalidateReview(projectId, milestoneId);
}

/**
 * A vendor asks the client to revisit a rating. Once per milestone, ever
 * (spec §6.5) — the client always makes the final call.
 */
export async function requestRatingReconsideration(projectId: string, milestoneId: string) {
  const { project } = await requirePermission(projectId, canEditMilestone, "You are not a member of this project's vendor team.");
  assertActiveProject(project);
  await connectToDatabase();

  const milestone = await MilestoneModel.findById(milestoneId);
  if (!milestone || String(milestone.projectId) !== projectId) throw new Error("Milestone not found.");
  if (milestone.status !== "reviewed") throw new Error("Only a reviewed milestone can be reconsidered.");
  if (milestone.editRequestedByVendor) {
    throw new Error("A reconsideration has already been requested for this milestone.");
  }

  milestone.editRequestedByVendor = true;
  await milestone.save();

  await logActivity({
    projectId,
    milestoneId,
    type: "FEEDBACK_REMINDER_SENT",
    message: `Vendor asked the client to reconsider the rating for "${milestone.title}"`,
  });

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

/** Step 1 (spec §6.8): vendor Owner asks the client to confirm the project is delivered. */
export async function requestCompletion(projectId: string) {
  const { project } = await requirePermission(projectId, canRequestCompletion, "Only a project owner can request completion.");
  await connectToDatabase();

  if (project.executionStatus !== "ongoing") {
    throw new Error("Completion can only be requested while the project is ongoing.");
  }
  const sent = await MilestoneModel.exists({ projectId, status: "sent" });
  if (sent) {
    throw new Error("A milestone is still with the client. Wait for that review before requesting completion.");
  }

  await ProjectModel.findByIdAndUpdate(projectId, {
    executionStatus: "awaiting_completion",
    completionRequestedAt: new Date(),
  });
  await logActivity({
    projectId,
    type: "PROJECT_UPDATED",
    message: "Vendor requested project completion — awaiting client confirmation",
  });

  revalidateCompletion(projectId);
}

/** Step 2 (spec §6.8): the client's Primary Contact confirms; the running average locks in. */
export async function confirmCompletion(projectId: string) {
  await requirePermission(projectId, canConfirmCompletion, "Only the primary client contact can confirm completion.");
  await connectToDatabase();

  await recomputeProjectScore(projectId);
  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");
  if (doc.executionStatus !== "awaiting_completion") {
    throw new Error("This project is not awaiting completion confirmation.");
  }

  doc.executionStatus = "completed";
  doc.completionConfirmedByClient = true;
  doc.finalScore = doc.liveScore ?? null;
  await doc.save();

  await logActivity({
    projectId,
    type: "PROJECT_COMPLETED",
    message: `Client confirmed completion — final score locked${doc.finalScore != null ? ` at ${doc.finalScore.toFixed(1)}` : " (unrated)"}`,
  });

  revalidateCompletion(projectId);
}

/** Step 3 (spec §6.8): after the timeout window, an admin force-completes using whatever ratings exist. */
export async function forceCompleteProject(projectId: string) {
  await requireUser("admin");
  await connectToDatabase();

  await recomputeProjectScore(projectId);
  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");
  if (doc.executionStatus !== "awaiting_completion") {
    throw new Error("This project is not awaiting completion.");
  }
  const cutoff = Date.now() - COMPLETION_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;
  if (!doc.completionRequestedAt || doc.completionRequestedAt.getTime() > cutoff) {
    throw new Error(`The client still has time to respond (${COMPLETION_TIMEOUT_DAYS}-day window).`);
  }

  doc.executionStatus = "completed";
  doc.completionForcedByAdmin = true;
  doc.finalScore = doc.liveScore ?? null;
  await doc.save();

  await logActivity({
    projectId,
    type: "PROJECT_COMPLETED",
    message: `Admin force-completed after the ${COMPLETION_TIMEOUT_DAYS}-day timeout${
      doc.finalScore != null ? ` — final score ${doc.finalScore.toFixed(1)}` : " (unrated)"
    }`,
  });

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

/**
 * Vendor Owner asks the client for a capstone endorsement. Separate from the
 * completion request, allowed only after the project is completed, once ever
 * (spec §6.9). The tier is frozen from `finalScore` at this point.
 */
export async function requestCapstone(projectId: string) {
  await requirePermission(projectId, canRequestCapstone, "Only a project owner can request a capstone endorsement.");
  await connectToDatabase();

  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");
  if (doc.executionStatus !== "completed") {
    throw new Error("A capstone endorsement can only be requested after the project is completed.");
  }
  if (doc.capstone?.requested) {
    throw new Error("A capstone endorsement has already been requested for this project.");
  }

  doc.capstone = {
    requested: true,
    submitted: false,
    attributes: [],
    testimonial: "",
    anonymous: false,
    tier: tierForScore(doc.finalScore ?? null),
    requestedAt: new Date(),
    submittedAt: null,
  } as never;
  await doc.save();

  await logActivity({
    projectId,
    type: "PROJECT_UPDATED",
    message: "Vendor requested a capstone endorsement from the client",
  });

  revalidateCapstone(projectId);
}

/**
 * Primary Contact submits the capstone: up to 5 attributes from the frozen
 * tier pool, a short testimonial, and an optional anonymous flag. No stars
 * (spec §4.5, §6.9).
 */
export async function submitCapstone(projectId: string, formData: FormData) {
  await requirePermission(projectId, canSubmitCapstone, "Only the primary client contact can submit the capstone endorsement.");
  await connectToDatabase();

  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");
  if (!doc.capstone?.requested) throw new Error("No capstone endorsement has been requested for this project.");
  if (doc.capstone.submitted) throw new Error("The capstone endorsement has already been submitted.");

  const pool = new Set(CAPSTONE_ATTRIBUTE_POOL[doc.capstone.tier as CapstoneTier]);
  const attributes = formData.getAll("attributes").map(String).filter((a) => pool.has(a));
  if (attributes.length === 0) throw new Error("Pick at least one attribute.");
  if (attributes.length > MAX_CAPSTONE_ATTRIBUTES) {
    throw new Error(`Pick at most ${MAX_CAPSTONE_ATTRIBUTES} attributes.`);
  }
  const testimonial = str(formData, "testimonial");
  if (!testimonial) throw new Error("A short testimonial is required.");

  doc.capstone.attributes = attributes as never;
  doc.capstone.testimonial = testimonial;
  doc.capstone.anonymous = formData.get("anonymous") === "on";
  doc.capstone.submitted = true;
  doc.capstone.submittedAt = new Date();
  await doc.save();

  await logActivity({
    projectId,
    type: "FEEDBACK_RECEIVED",
    message: "Client submitted a capstone endorsement",
  });

  revalidateCapstone(projectId);
  redirect(`/my-projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Publication (PRD §18-21)
// ---------------------------------------------------------------------------

export async function publishProject(projectId: string, formData: FormData) {
  await requirePermission(projectId, canManageProject, "Only a project owner can publish the project.");
  await connectToDatabase();

  // A project can only be shown publicly once the admin has approved the shell
  // (Milestones plan §5.1, §9).
  const project = await ProjectModel.findById(projectId).select("adminStatus");
  if (!project) throw new Error("Project not found.");
  if (project.adminStatus !== "published") {
    throw new Error("This project needs admin approval before it can be published to the public portfolio.");
  }

  await logActivity({ projectId, type: "PUBLICATION_REQUESTED", message: "Publication requested by vendor" });

  await ProjectModel.findByIdAndUpdate(projectId, {
    visibility: "PUBLIC",
    publishedAt: new Date(),
    publicSummary: optStr(formData, "publicSummary"),
    publicKeyChallenges: optStr(formData, "publicKeyChallenges"),
    publicSolution: optStr(formData, "publicSolution"),
    publicOutcome: optStr(formData, "publicOutcome"),
    publicTechStack: optStr(formData, "publicTechStack"),
    publicPlatforms: optStr(formData, "publicPlatforms"),
    publicBudget: optStr(formData, "publicBudget"),
    publicImageUrl: optStr(formData, "publicImageUrl"),
    publicPerformanceConsent: formData.get("publicPerformanceConsent") === "on",
  });

  await logActivity({ projectId, type: "PROJECT_PUBLISHED", message: "Project published to public portfolio" });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}/public-preview`);
}

export async function unpublishProject(projectId: string) {
  await requirePermission(projectId, canManageProject, "Only a project owner can change publication.");
  await connectToDatabase();

  await ProjectModel.findByIdAndUpdate(projectId, { visibility: "PRIVATE", publishedAt: null });
  await logActivity({ projectId, type: "PROJECT_UPDATED", message: "Project reverted to private" });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

// ---------------------------------------------------------------------------
// People & invitations (Milestones plan, Phase 3 — spec §4.3, §4.4, §7, §8)
// ---------------------------------------------------------------------------

export async function inviteVendorTeamMember(projectId: string, formData: FormData) {
  const { user } = await requirePermission(projectId, canInviteTeammate, "Only a project owner can invite teammates.");

  const email = (optStr(formData, "email") ?? "").toLowerCase();
  if (!email) throw new Error("An email address is required.");
  const role = str(formData, "role") === "owner" ? "owner" : "member";

  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");
  if (doc.vendorTeam.some((v) => v.email === email)) throw new Error("That person is already on the vendor team.");

  await InvitationModel.create({
    email,
    projectId,
    kind: "vendor_team",
    proposedRole: role,
    invitedByUserId: user.id,
  });
  doc.vendorTeam.push({ userId: null, email, name: null, role, invitePending: true } as never);
  await doc.save();

  await logActivity({ projectId, type: "PROJECT_UPDATED", message: `Invited ${email} to the vendor team as ${role}` });
  revalidatePath(`/projects/${projectId}/team`);
}

export async function removeVendorTeamMember(projectId: string, formData: FormData) {
  await requirePermission(projectId, canInviteTeammate, "Only a project owner can remove teammates.");

  const email = (optStr(formData, "email") ?? "").toLowerCase();
  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");

  const target = doc.vendorTeam.find((v) => v.email === email);
  if (!target) throw new Error("That person is not on the vendor team.");

  const activeOwners = doc.vendorTeam.filter((v) => v.role === "owner" && !v.invitePending);
  if (target.role === "owner" && !target.invitePending && activeOwners.length <= 1) {
    throw new Error("A project must always keep at least one vendor owner.");
  }

  doc.vendorTeam = doc.vendorTeam.filter((v) => v.email !== email) as never;
  await doc.save();
  await InvitationModel.updateMany(
    { projectId, email, kind: "vendor_team", status: "pending" },
    { $set: { status: "revoked" } },
  );

  await logActivity({ projectId, type: "PROJECT_UPDATED", message: `Removed ${email} from the vendor team` });
  revalidatePath(`/projects/${projectId}/team`);
}

/** Vendor Owner invites (or reassigns) the client's Primary Contact. */
export async function inviteClientContact(projectId: string, formData: FormData) {
  const { user } = await requirePermission(projectId, canInviteTeammate, "Only a project owner can invite the client contact.");

  const email = (optStr(formData, "email") ?? "").toLowerCase();
  if (!email) throw new Error("An email address is required.");
  const designation = optStr(formData, "designation") ?? "Client Contact";

  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");

  // Exactly one Primary Contact (spec §4.4): drop a never-accepted primary, demote an accepted one.
  for (const c of doc.clientContacts) {
    if (c.role === "primary" && !c.invitePending && c.email !== email) c.role = "collaborator";
  }
  doc.clientContacts = doc.clientContacts.filter(
    (c) => !(c.role === "primary" && c.invitePending && c.email !== email),
  ) as never;
  await InvitationModel.updateMany(
    { projectId, kind: "client_contact", proposedRole: "primary", status: "pending", email: { $ne: email } },
    { $set: { status: "revoked" } },
  );

  const existing = doc.clientContacts.find((c) => c.email === email);
  if (existing) {
    existing.role = "primary";
    existing.designation = designation;
    if (!existing.userId) existing.invitePending = true;
  } else {
    doc.clientContacts.push({
      userId: null,
      email,
      name: null,
      designation,
      role: "primary",
      invitePending: true,
    } as never);
  }
  await doc.save();

  if (!existing?.userId) {
    await InvitationModel.create({
      email,
      projectId,
      kind: "client_contact",
      proposedRole: "primary",
      designation,
      invitedByUserId: user.id,
    });
  }

  await logActivity({ projectId, type: "PROJECT_UPDATED", message: `Invited ${email} as the primary client contact` });
  revalidatePath(`/projects/${projectId}/team`);
}

/** Vendor Owner promotes an existing (accepted) Collaborator to Primary Contact. */
export async function reassignPrimaryContact(projectId: string, formData: FormData) {
  await requirePermission(projectId, canInviteTeammate, "Only a project owner can reassign the primary contact.");

  const email = (optStr(formData, "email") ?? "").toLowerCase();
  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");

  const target = doc.clientContacts.find((c) => c.email === email && !c.invitePending);
  if (!target) throw new Error("That person is not an active client contact on this project.");

  for (const c of doc.clientContacts) {
    if (c.role === "primary" && !c.invitePending) c.role = "collaborator";
  }
  target.role = "primary";
  await doc.save();

  await logActivity({ projectId, type: "PROJECT_UPDATED", message: `${email} is now the primary client contact` });
  revalidatePath(`/projects/${projectId}/team`);
  revalidatePath(`/my-projects/${projectId}/people`);
}

/** Primary Contact invites a Collaborator (spec §8). */
export async function inviteCollaborator(projectId: string, formData: FormData) {
  const { user } = await requirePermission(projectId, canInviteCollaborator, "Only the primary contact can invite collaborators.");

  const email = (optStr(formData, "email") ?? "").toLowerCase();
  if (!email) throw new Error("An email address is required.");

  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");
  if (doc.clientContacts.some((c) => c.email === email)) throw new Error("That person is already a client contact.");

  await InvitationModel.create({
    email,
    projectId,
    kind: "client_contact",
    proposedRole: "collaborator",
    invitedByUserId: user.id,
  });
  doc.clientContacts.push({
    userId: null,
    email,
    name: null,
    designation: "Collaborator",
    role: "collaborator",
    invitePending: true,
  } as never);
  await doc.save();

  await logActivity({ projectId, type: "PROJECT_UPDATED", message: `Invited ${email} as a collaborator` });
  revalidatePath(`/projects/${projectId}/team`);
  revalidatePath(`/my-projects/${projectId}/people`);
}

export async function removeClientContact(projectId: string, formData: FormData) {
  const { user, project } = await requirePermission(
    projectId,
    (u, p) => canInviteTeammate(u, p) || canInviteCollaborator(u, p),
    "You cannot manage this project's client contacts.",
  );

  const email = (optStr(formData, "email") ?? "").toLowerCase();
  const doc = await ProjectModel.findById(projectId);
  if (!doc) throw new Error("Project not found.");

  const target = doc.clientContacts.find((c) => c.email === email);
  if (!target) throw new Error("That person is not a client contact on this project.");

  const isOwner = canInviteTeammate(user, project);
  if (!isOwner && target.role !== "collaborator") {
    throw new Error("The primary contact can only remove collaborators.");
  }
  if (target.role === "primary" && !target.invitePending) {
    throw new Error("Reassign the primary contact before removing them.");
  }

  doc.clientContacts = doc.clientContacts.filter((c) => c.email !== email) as never;
  await doc.save();
  await InvitationModel.updateMany(
    { projectId, email, kind: "client_contact", status: "pending" },
    { $set: { status: "revoked" } },
  );

  await logActivity({ projectId, type: "PROJECT_UPDATED", message: `Removed client contact ${email}` });
  revalidatePath(`/projects/${projectId}/team`);
  revalidatePath(`/my-projects/${projectId}/people`);
}

/** Accept an invitation as the already-signed-in matching user. */
export async function acceptInvitation(invitationId: string) {
  const user = await requireUser();
  const result = await applyInvitationAcceptance(invitationId, user);
  if (!result.ok) throw new Error(result.error);
  await issueSession(result.sessionUser);
  revalidatePath("/my-projects");
  revalidatePath(result.redirectTo);
  redirect(result.redirectTo);
}
