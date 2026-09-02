import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";

// Milestones now carry a start date and a due date. The old single `targetDate`
// is the due date, so rename it; `startDate` simply defaults to null on existing
// rows.
//   milestones.targetDate -> milestones.dueDate
//   npm run migrate:012
// Safe to re-run — no-ops once every row has been renamed.

async function main() {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error("no database handle");

  const res = await db
    .collection("milestones")
    .updateMany({ targetDate: { $exists: true } }, { $rename: { targetDate: "dueDate" } });

  console.log(`Renamed targetDate -> dueDate on ${res.modifiedCount} milestone(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
