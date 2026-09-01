import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import { MilestoneModel, ProjectModel } from "../../src/lib/models";
import { runningAverage } from "../../src/lib/scoring";
import { minReviewThreshold } from "../../src/lib/constants";

// Milestones plan, Phase 5. Backfills the stored score fields from current
// milestone data:
//   npm run migrate:004
// - liveScore            = running average of reviewed milestones
// - reviewedMilestoneCount
// - minReviewThreshold   = min(2, ceil(0.25 * total))
// `finalScore` is left alone (it locks at completion in Phase 6). Safe to re-run.
async function main() {
  await connectToDatabase();

  const projects = await ProjectModel.find({}).select({ _id: 1 }).lean();
  let updated = 0;

  for (const p of projects) {
    const milestones = await MilestoneModel.find({ projectId: p._id }).select("status rating").lean();
    const reviewed = milestones.filter((m) => m.status === "reviewed" && m.rating != null);
    await ProjectModel.updateOne(
      { _id: p._id },
      {
        $set: {
          liveScore: runningAverage(milestones),
          reviewedMilestoneCount: reviewed.length,
          minReviewThreshold: minReviewThreshold(milestones.length),
        },
      },
    );
    updated++;
  }

  console.log(`Recomputed scores for ${updated} project(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
