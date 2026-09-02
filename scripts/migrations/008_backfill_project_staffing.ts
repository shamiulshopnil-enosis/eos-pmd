import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import { CompanyMemberModel, ProjectModel } from "../../src/lib/models";

// Company-model unification PR2. Under the new model a plain company "member" only reaches a
// project if they're assigned to it. Migration 007 turned each project's client
// contacts into receiving-company memberships (primary -> owner, others -> member);
// this backfills receivingMemberIds / assignedMemberIds from the embedded
// vendorTeam / clientContacts so nobody loses the access they had.
//   npm run migrate:008
// Safe to re-run.

type Id = mongoose.Types.ObjectId;

async function membershipIds(companyId: Id | null | undefined, emails: string[]): Promise<Id[]> {
  if (!companyId || emails.length === 0) return [];
  const rows = await CompanyMemberModel.find({
    companyId,
    email: { $in: emails.map((e) => e.toLowerCase()) },
  })
    .select({ _id: 1 })
    .lean();
  return rows.map((r) => r._id as Id);
}

async function main() {
  await connectToDatabase();

  let updated = 0;
  for (const p of await ProjectModel.find({})) {
    const deliveryEmails = (p.vendorTeam ?? [])
      .map((v: { email?: string }) => v.email)
      .filter(Boolean) as string[];
    const reviewEmails = (p.clientContacts ?? [])
      .map((c: { email?: string }) => c.email)
      .filter(Boolean) as string[];

    const wantDelivery = await membershipIds(p.deliveringCompanyId as Id, deliveryEmails);
    const wantReview = await membershipIds(p.receivingCompanyId as Id, reviewEmails);

    const mergeIds = (existing: unknown, add: Id[]): Id[] => {
      const set = new Map<string, Id>();
      for (const x of (existing as Id[]) ?? []) set.set(String(x), x);
      for (const x of add) set.set(String(x), x);
      return [...set.values()];
    };

    const nextDelivery = mergeIds(p.assignedMemberIds, wantDelivery);
    const nextReview = mergeIds(p.receivingMemberIds, wantReview);

    const changed =
      nextDelivery.length !== ((p.assignedMemberIds as unknown[]) ?? []).length ||
      nextReview.length !== ((p.receivingMemberIds as unknown[]) ?? []).length;
    if (changed) {
      p.set("assignedMemberIds", nextDelivery);
      p.set("receivingMemberIds", nextReview);
      await p.save();
      updated++;
    }
  }

  console.log(`Backfilled staffing on ${updated} project(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
