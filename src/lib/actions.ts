"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "./mongoose";
import { ActivityModel, FeedbackRequestModel, ProjectModel, ReleaseModel } from "./models";
import { RATING_CATEGORIES } from "./constants";
import type { ActivityType } from "./types";

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
  releaseId?: string | null;
  type: ActivityType;
  message: string;
}) {
  await ActivityModel.create({
    projectId: params.projectId,
    releaseId: params.releaseId ?? null,
    type: params.type,
    message: params.message,
  });
}

// ---------------------------------------------------------------------------
// Projects (PRD §5, §6)
// ---------------------------------------------------------------------------

export async function createProject(formData: FormData) {
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
  });

  const projectId = project._id.toString();

  await logActivity({
    projectId,
    type: "PROJECT_CREATED",
    message: `Project "${project.name}" created for ${project.clientCompanyName}`,
  });

  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  await connectToDatabase();

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

  await logActivity({ projectId, type: "PROJECT_UPDATED", message: `Project details updated` });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function setProjectStatus(projectId: string, formData: FormData) {
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
// Releases (PRD §7, §8)
// ---------------------------------------------------------------------------

export async function createRelease(projectId: string, formData: FormData) {
  await connectToDatabase();

  const release = await ReleaseModel.create({
    projectId,
    name: str(formData, "name"),
    versionLabel: optStr(formData, "versionLabel"),
    description: optStr(formData, "description"),
    objectives: optStr(formData, "objectives"),
    deliverables: optStr(formData, "deliverables"),
    plannedDeliveryDate: optDate(formData, "plannedDeliveryDate"),
    startDate: optDate(formData, "startDate"),
    demoUrl: optStr(formData, "demoUrl"),
    internalNotes: optStr(formData, "internalNotes"),
    clientFacingNotes: optStr(formData, "clientFacingNotes"),
    teamSize: optInt(formData, "teamSize"),
  });

  const releaseId = release._id.toString();

  await logActivity({
    projectId,
    releaseId,
    type: "RELEASE_CREATED",
    message: `Release "${release.name}" created`,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/releases");
  redirect(`/projects/${projectId}/releases/${releaseId}`);
}

export async function updateRelease(projectId: string, releaseId: string, formData: FormData) {
  await connectToDatabase();

  await ReleaseModel.findByIdAndUpdate(releaseId, {
    name: str(formData, "name"),
    versionLabel: optStr(formData, "versionLabel"),
    description: optStr(formData, "description"),
    objectives: optStr(formData, "objectives"),
    deliverables: optStr(formData, "deliverables"),
    plannedDeliveryDate: optDate(formData, "plannedDeliveryDate"),
    actualDeliveryDate: optDate(formData, "actualDeliveryDate"),
    startDate: optDate(formData, "startDate"),
    demoUrl: optStr(formData, "demoUrl"),
    internalNotes: optStr(formData, "internalNotes"),
    clientFacingNotes: optStr(formData, "clientFacingNotes"),
    teamSize: optInt(formData, "teamSize"),
  });

  await logActivity({ projectId, releaseId, type: "RELEASE_UPDATED", message: `Release details updated` });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/releases/${releaseId}`);
  revalidatePath("/releases");
  redirect(`/projects/${projectId}/releases/${releaseId}`);
}

/** PRD §8 — manual status transition; auto-stamps Actual Delivery Date on first Delivered. */
export async function setReleaseStatus(projectId: string, releaseId: string, formData: FormData) {
  await connectToDatabase();

  const status = str(formData, "status");
  const release = await ReleaseModel.findById(releaseId);
  if (!release) throw new Error("Release not found.");

  release.status = status as typeof release.status;
  if (status === "DELIVERED" && !release.actualDeliveryDate) {
    release.actualDeliveryDate = new Date();
  }
  await release.save();

  await logActivity({
    projectId,
    releaseId,
    type: status === "DELIVERED" ? "RELEASE_DELIVERED" : "RELEASE_UPDATED",
    message: `Release status changed to ${status.replace("_", " ")}`,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/releases/${releaseId}`);
  revalidatePath("/releases");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Client feedback (PRD §9, §10, §11)
// ---------------------------------------------------------------------------

/** Vendor requests feedback on a delivered release. Creates the secure invitation. */
export async function requestFeedback(projectId: string, releaseId: string, formData: FormData) {
  await connectToDatabase();

  const project = await ProjectModel.findById(projectId);
  if (!project) throw new Error("Project not found.");
  const clientEmail = optStr(formData, "clientEmail") ?? project.clientEmail;
  const token = randomUUID();

  await FeedbackRequestModel.findOneAndUpdate(
    { releaseId },
    {
      $set: {
        clientEmail,
        token,
        status: "PENDING",
        sentAt: new Date(),
        remindersSent: 0,
        completedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await ReleaseModel.findByIdAndUpdate(releaseId, { status: "FEEDBACK_REQUESTED" });

  await logActivity({
    projectId,
    releaseId,
    type: "FEEDBACK_REQUESTED",
    message: `Feedback requested from ${clientEmail}`,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/releases/${releaseId}`);
  revalidatePath("/releases");
  revalidatePath("/dashboard");
}

/** PRD §11 — vendor can resend, never edit, a pending request. */
export async function resendFeedback(projectId: string, releaseId: string) {
  await connectToDatabase();

  const existing = await FeedbackRequestModel.findOne({ releaseId });
  if (!existing) throw new Error("No feedback request to resend.");
  if (existing.status === "COMPLETED") return; // integrity: nothing to resend once submitted

  existing.token = randomUUID();
  existing.sentAt = new Date();
  existing.remindersSent += 1;
  await existing.save();

  await logActivity({
    projectId,
    releaseId,
    type: "FEEDBACK_REMINDER_SENT",
    message: `Feedback request resent to ${existing.clientEmail}`,
  });

  revalidatePath(`/projects/${projectId}/releases/${releaseId}`);
}

/** Client-side submission — the only mutation a client can perform, and only once. */
export async function submitEvaluation(token: string, formData: FormData) {
  await connectToDatabase();

  const request = await FeedbackRequestModel.findOne({ token });
  if (!request) throw new Error("This feedback link is invalid.");
  if (request.status === "COMPLETED") {
    redirect(`/feedback/${token}/thanks`);
  }

  const requiredMissing = RATING_CATEGORIES.filter((c) => c.required).some((c) => optInt(formData, c.key) == null);
  if (requiredMissing) throw new Error("Please rate every required category.");

  for (const cat of RATING_CATEGORIES) {
    request.set(cat.key, optInt(formData, cat.key));
  }

  request.comments = optStr(formData, "comments");
  request.reviewerEmail = optStr(formData, "reviewerEmail") ?? request.clientEmail;
  request.status = "COMPLETED";
  request.completedAt = new Date();
  await request.save();

  const release = await ReleaseModel.findByIdAndUpdate(
    request.releaseId,
    { status: "REVIEWED" },
    { new: true },
  );
  if (!release) throw new Error("Release not found.");

  await logActivity({
    projectId: release.projectId.toString(),
    releaseId: release._id.toString(),
    type: "FEEDBACK_RECEIVED",
    message: `Client feedback received for "${release.name}" (${request.overallSatisfaction}/5 overall)`,
  });

  revalidatePath(`/projects/${release.projectId.toString()}`);
  revalidatePath(`/projects/${release.projectId.toString()}/releases/${release._id.toString()}`);
  revalidatePath("/releases");
  revalidatePath("/dashboard");
  redirect(`/feedback/${token}/thanks`);
}

// ---------------------------------------------------------------------------
// Publication (PRD §18-21)
// ---------------------------------------------------------------------------

export async function publishProject(projectId: string, formData: FormData) {
  await connectToDatabase();

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
  await connectToDatabase();

  await ProjectModel.findByIdAndUpdate(projectId, { visibility: "PRIVATE", publishedAt: null });
  await logActivity({ projectId, type: "PROJECT_UPDATED", message: "Project reverted to private" });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}
