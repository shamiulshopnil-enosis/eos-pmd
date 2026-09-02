import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";

// Company rename. "Organization" is not the term EOS uses — everything is now
// "Company". The Mongoose models were renamed Organization -> Company and
// OrgMembership -> CompanyMember, which changes the collections Mongoose derives
// (organizations -> companies, orgmemberships -> companymembers). This migration
// renames those collections in place and $renames the org-named document fields
// left over from migration 007:
//   Project.deliveringOrgId  -> deliveringCompanyId
//   Project.receivingOrgId   -> receivingCompanyId
//   Team.orgId               -> companyId
//   companymembers.orgId     -> companyId
//   npm run migrate:010
// Safe to re-run — each step no-ops once applied. An empty target collection
// (auto-created by Mongoose the first time the renamed model was queried) is
// dropped so the real data can take its place.

async function renameCollection(from: string, to: string): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error("no database handle");
  const count = async (name: string): Promise<number | null> => {
    if ((await db.listCollections({ name }).toArray()).length === 0) return null;
    return db.collection(name).countDocuments();
  };

  const fromCount = await count(from);
  const toCount = await count(to);

  if (fromCount === null) {
    console.log(`  ${from}: absent — skipped (already ${to})`);
    return;
  }
  if (toCount !== null) {
    if (toCount === 0) {
      await db.collection(to).drop();
      console.log(`  ${to}: dropped empty auto-created collection`);
    } else {
      console.log(`  ${to}: has ${toCount} doc(s) — leaving ${from} (${fromCount}) untouched, skipped`);
      return;
    }
  }
  await db.collection(from).rename(to);
  console.log(`  ${from} -> ${to} (${fromCount} doc(s))`);
}

async function main() {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error("no database handle");

  console.log("Renaming collections:");
  await renameCollection("organizations", "companies");
  await renameCollection("orgmemberships", "companymembers");

  // Drop indexes carried over from the old collection names that still key on
  // `orgId` — the unique `orgId_1_email_1` in particular blocks the field
  // rename below (every renamed doc looks like `orgId: null` to it).
  console.log("Dropping stale orgId indexes:");
  for (const coll of ["companymembers", "teams"]) {
    if ((await db.listCollections({ name: coll }).toArray()).length === 0) continue;
    for (const ix of await db.collection(coll).indexes()) {
      if (ix.name && ix.name !== "_id_" && Object.keys(ix.key ?? {}).some((k) => k === "orgId")) {
        await db.collection(coll).dropIndex(ix.name);
        console.log(`  ${coll}.${ix.name}`);
      }
    }
  }

  console.log("Renaming document fields:");
  const projRes = await db.collection("projects").updateMany(
    { $or: [{ deliveringOrgId: { $exists: true } }, { receivingOrgId: { $exists: true } }] },
    { $rename: { deliveringOrgId: "deliveringCompanyId", receivingOrgId: "receivingCompanyId" } },
  );
  console.log(`  projects: ${projRes.modifiedCount} doc(s) deliveringOrgId/receivingOrgId -> *CompanyId`);

  const teamRes = await db
    .collection("teams")
    .updateMany({ orgId: { $exists: true } }, { $rename: { orgId: "companyId" } });
  console.log(`  teams: ${teamRes.modifiedCount} doc(s) orgId -> companyId`);

  const memberRes = await db
    .collection("companymembers")
    .updateMany({ orgId: { $exists: true } }, { $rename: { orgId: "companyId" } });
  console.log(`  companymembers: ${memberRes.modifiedCount} doc(s) orgId -> companyId`);

  // Recreate the indexes the schemas expect under the new field name.
  console.log("Recreating company-side indexes:");
  await db.collection("companymembers").createIndex({ companyId: 1, email: 1 }, { unique: true });
  await db.collection("companymembers").createIndex({ userId: 1 });
  await db.collection("teams").createIndex({ companyId: 1 });
  console.log("  companymembers {companyId,email} unique, companymembers {userId}, teams {companyId}");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
