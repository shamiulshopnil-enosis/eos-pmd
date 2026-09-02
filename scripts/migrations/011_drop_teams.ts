import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";

// Drop the Teams concept. Teams were a named grouping of company members that
// could be assigned to a project as a live reference. They are replaced by
// assigning individual people to a project directly (Jira-style). This migration
// flattens every project's team assignments into its individual-member
// assignments so nobody loses project access, clears the now-unused fields, and
// drops the `teams` collection.
//   Project.assignedTeamIds  -> members folded into Project.assignedMemberIds
//   Project.receivingTeamIds -> members folded into Project.receivingMemberIds
//   npm run migrate:011
// Safe to re-run — no-ops once the fields and collection are gone.

type Id = mongoose.Types.ObjectId;

async function main() {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error("no database handle");

  const teams = db.collection("teams");
  const projects = db.collection("projects");

  // teamId -> its member ids (as strings, for set-union)
  const teamMembers = new Map<string, string[]>();
  for (const t of await teams.find({}).toArray()) {
    teamMembers.set(
      String(t._id),
      ((t.memberIds as unknown[]) ?? []).map((m) => String(m)),
    );
  }

  const withTeams = await projects
    .find({ $or: [{ assignedTeamIds: { $exists: true } }, { receivingTeamIds: { $exists: true } }] })
    .toArray();

  let flattened = 0;
  for (const p of withTeams) {
    const fold = (memberField: unknown, teamField: unknown): Id[] => {
      const set = new Map<string, Id>();
      for (const x of (memberField as Id[]) ?? []) set.set(String(x), x);
      for (const tid of (teamField as Id[]) ?? []) {
        for (const mid of teamMembers.get(String(tid)) ?? []) {
          set.set(mid, new mongoose.Types.ObjectId(mid));
        }
      }
      return [...set.values()];
    };

    await projects.updateOne(
      { _id: p._id },
      {
        $set: {
          assignedMemberIds: fold(p.assignedMemberIds, p.assignedTeamIds),
          receivingMemberIds: fold(p.receivingMemberIds, p.receivingTeamIds),
        },
        $unset: { assignedTeamIds: "", receivingTeamIds: "" },
      },
    );
    flattened++;
  }
  console.log(`Flattened team assignments on ${flattened} project(s); cleared *TeamIds.`);

  const hasTeams = (await db.listCollections({ name: "teams" }).toArray()).length > 0;
  if (hasTeams) {
    await teams.drop();
    console.log("Dropped the `teams` collection.");
  } else {
    console.log("`teams` collection already absent.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
