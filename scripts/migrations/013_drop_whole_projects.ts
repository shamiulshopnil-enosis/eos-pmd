import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";

// "Whole projects" are gone — every project is a milestone project with one or
// more milestones. A whole project already carried exactly one milestone (the
// "Project delivery" row created with it), so this migration only needs to:
//   1. guarantee every whole project has at least one milestone (create a
//      "Project delivery" draft from the project's delivery if somehow missing),
//   2. drop the now-unused `projectType` field from every project.
//   npm run migrate:013
// Safe to re-run — no-ops once `projectType` is gone everywhere.

async function main() {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error("no database handle");

  const projects = db.collection("projects");
  const milestones = db.collection("milestones");

  const wholeProjects = await projects.find({ projectType: "whole" }).toArray();
  let backfilled = 0;
  for (const p of wholeProjects) {
    const count = await milestones.countDocuments({ projectId: p._id });
    if (count === 0) {
      await milestones.insertOne({
        projectId: p._id,
        title: "Project delivery",
        description: "",
        url: null,
        startDate: p.startDate ?? null,
        dueDate: p.expectedCompletionDate ?? null,
        status: "draft",
        assignees: [],
        attachments: [],
        ratings: null,
        ratingNotes: null,
        rating: null,
        comment: null,
        editRequestedByVendor: false,
        ratingSubmittedAt: null,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewedByName: null,
        reviewedByEmail: null,
        sentAt: null,
        rejectedAt: null,
        rejectedByUserId: null,
        rejectedByName: null,
        rejectedByEmail: null,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      backfilled += 1;
    }
  }

  const res = await projects.updateMany(
    { projectType: { $exists: true } },
    { $unset: { projectType: "" } },
  );

  console.log(
    `Backfilled ${backfilled} missing "Project delivery" milestone(s); dropped projectType from ${res.modifiedCount} project(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
