import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import { MilestoneModel } from "../../src/lib/models";

// Multi-dimension milestone review (Enosis Client Feedback Form). Backfills the
// new `ratings` sub-document for every already-reviewed milestone by copying its
// single `rating` into all five dimensions (best guess — there's no per-dimension
// history). `rating` itself is unchanged, so scoring is unaffected.
//   npm run migrate:006
// Safe to re-run — only touches reviewed milestones whose `ratings` is still null.

const DIMS = ["deliverables", "timeliness", "understanding", "planning", "communication"] as const;

async function main() {
  await connectToDatabase();

  const milestones = await MilestoneModel.find({
    status: "reviewed",
    rating: { $ne: null },
    $or: [{ ratings: null }, { ratings: { $exists: false } }],
  });

  let updated = 0;
  for (const m of milestones) {
    const score = Math.max(1, Math.min(5, Math.round(m.rating as number)));
    m.set(
      "ratings",
      Object.fromEntries(DIMS.map((d) => [d, score])),
    );
    await m.save();
    updated++;
  }

  console.log(`Backfilled review dimensions on ${updated} milestone(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
