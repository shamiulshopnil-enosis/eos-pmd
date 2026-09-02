import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import { MilestoneModel, ProjectModel } from "../../src/lib/models";
import { sanitizeMilestoneHtml } from "../../src/lib/richtext";

// Milestones plan, Phase 2. Folds `releases` + `feedbackrequests` into `milestones`,
// remaps activity.releaseId -> activity.milestoneId, then drops the old collections.
//   npm run migrate:002
// Idempotent: re-running after the collections are gone is a no-op.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildDescription(r: Record<string, unknown>): string {
  const parts: string[] = [];
  if (r.description) parts.push(`<p>${escapeHtml(String(r.description))}</p>`);
  if (r.deliverables) {
    const items = String(r.deliverables)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length > 1) {
      parts.push(`<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`);
    } else {
      parts.push(`<p>${escapeHtml(String(r.deliverables))}</p>`);
    }
  }
  return sanitizeMilestoneHtml(parts.join(""));
}

function mapStatus(s: unknown): "draft" | "sent" | "reviewed" {
  if (s === "REVIEWED" || s === "CLOSED") return "reviewed";
  if (s === "FEEDBACK_REQUESTED") return "sent";
  return "draft";
}

async function main() {
  await connectToDatabase();
  const db = mongoose.connection.db!;

  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  if (!collections.includes("releases")) {
    console.log("Already migrated (no `releases` collection).");
    return;
  }

  const releases = await db.collection("releases").find({}).toArray();
  const feedbacks = collections.includes("feedbackrequests")
    ? await db.collection("feedbackrequests").find({}).toArray()
    : [];
  const fbByRelease = new Map(feedbacks.map((f) => [String(f.releaseId), f]));

  const oldToNew = new Map<string, mongoose.Types.ObjectId>();
  const docs = releases.map((r) => {
    const fb = fbByRelease.get(String(r._id));
    const status = mapStatus(r.status);
    const _id = new mongoose.Types.ObjectId();
    oldToNew.set(String(r._id), _id);
    return {
      _id,
      projectId: r.projectId,
      title: r.name,
      description: buildDescription(r),
      dueDate: r.plannedDeliveryDate ?? null,
      status,
      rating: fb ? (fb.qualityOfDeliverables ?? fb.overallSatisfaction ?? null) : null,
      comment: fb ? (fb.comments ?? null) : null,
      editRequestedByVendor: false,
      ratingSubmittedAt: fb ? (fb.completedAt ?? null) : null,
      reviewedAt: status === "reviewed" && fb ? (fb.completedAt ?? null) : null,
      sentAt: fb ? (fb.sentAt ?? null) : status !== "draft" ? (r.createdAt ?? null) : null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? r.createdAt ?? new Date(),
    };
  });

  // Raw driver insert to preserve createdAt / updatedAt exactly (no Mongoose timestamp override).
  if (docs.length) await MilestoneModel.collection.insertMany(docs);

  // Whole projects with no milestones get one; whole projects never keep more than one.
  const projects = await ProjectModel.find({}).lean();
  for (const p of projects) {
    const projectType = (p as Record<string, unknown>).projectType ?? "whole";
    const existing = await MilestoneModel.find({ projectId: p._id }).sort({ createdAt: 1 });
    if (projectType !== "milestone") {
      if (existing.length === 0) {
        await MilestoneModel.create({
          projectId: p._id,
          title: "Project delivery",
          description: "",
          dueDate: (p as Record<string, unknown>).expectedCompletionDate ?? null,
          status: "draft",
        });
      } else if (existing.length > 1) {
        for (const extra of existing.slice(1)) await MilestoneModel.deleteOne({ _id: extra._id });
      }
    }
  }

  // Remap activity.releaseId -> activity.milestoneId.
  const acts = db.collection("activities");
  for (const [oldId, newId] of oldToNew) {
    await acts.updateMany(
      { releaseId: new mongoose.Types.ObjectId(oldId) },
      { $set: { milestoneId: newId }, $unset: { releaseId: "" } },
    );
  }
  await acts.updateMany(
    { releaseId: { $exists: true } },
    { $set: { milestoneId: null }, $unset: { releaseId: "" } },
  );

  await db.collection("releases").drop().catch(() => {});
  if (collections.includes("feedbackrequests")) {
    await db.collection("feedbackrequests").drop().catch(() => {});
  }

  console.log(`Migrated ${docs.length} release(s) -> milestone(s); dropped legacy collections.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
