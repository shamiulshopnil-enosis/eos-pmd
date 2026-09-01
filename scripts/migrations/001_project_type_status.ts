import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import { ProjectModel } from "../../src/lib/models";
import { minReviewThreshold } from "../../src/lib/constants";

// Milestones plan, Phase 1. Backfills the new Project fields on existing rows:
//   npm run migrate:001
// Safe to re-run - existing values are kept.
async function main() {
  await connectToDatabase();
  const db = mongoose.connection.db!;
  // Count from whichever delivery collection exists (releases pre-Phase 2, milestones after).
  const names = (await db.listCollections().toArray()).map((c) => c.name);
  const deliveryColl = names.includes("milestones")
    ? db.collection("milestones")
    : names.includes("releases")
      ? db.collection("releases")
      : null;

  const projects = await ProjectModel.find({}).lean();
  let updated = 0;

  for (const doc of projects) {
    const p = doc as Record<string, unknown>;
    const milestoneCount = deliveryColl
      ? await deliveryColl.countDocuments({ projectId: p._id })
      : 0;

    const set: Record<string, unknown> = {
      projectType: p.projectType ?? "whole",
      adminStatus: p.adminStatus ?? (p.visibility === "PUBLIC" ? "published" : "draft"),
      executionStatus: p.executionStatus ?? (p.status === "COMPLETED" ? "completed" : "ongoing"),
      minReviewThreshold: minReviewThreshold(milestoneCount),
      reviewedMilestoneCount: p.reviewedMilestoneCount ?? 0,
      completionRequestedAt: p.completionRequestedAt ?? null,
      completionConfirmedByClient: p.completionConfirmedByClient ?? false,
      completionForcedByAdmin: p.completionForcedByAdmin ?? false,
      liveScore: p.liveScore ?? null,
      finalScore: p.finalScore ?? null,
    };

    await ProjectModel.updateOne({ _id: p._id }, { $set: set });
    updated++;
  }

  console.log(`Updated ${updated} project(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
