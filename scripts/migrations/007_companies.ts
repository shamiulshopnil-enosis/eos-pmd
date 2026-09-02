import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import {
  ClientCompanyModel,
  CompanyModel,
  CompanyMemberModel,
  ProjectModel,
  TeamModel,
  UserModel,
  VendorMemberModel,
} from "../../src/lib/models";
import { SEED_VENDOR_EMAIL } from "../seed-users";
import { VENDOR_NAME } from "../../src/lib/constants";

// Company-model unification PR1. Introduces the Company model alongside the existing
// data and migrates into it. Behaviour is unchanged — projects still run off
// vendorTeam[] / clientContacts[]; deliveringCompanyId / receivingCompanyId are populated
// but not yet driving anything (that's PR2).
//   npm run migrate:007
// - seeds Company #1 (the platform vendor) from VENDOR_NAME
// - VendorMember rows  -> CompanyMember of that company (SAME _id, so
//   project.assignedMemberIds keep resolving)
// - Team.ownerUserId   -> Team.companyId
// - ClientCompany rows -> Company (unclaimed) + one owner membership
// - each Project gets deliveringCompanyId + receivingCompanyId; extra client contacts
//   become CompanyMember(member) of the receiving company
// Safe to re-run.

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rxExact = (s: string) => new RegExp(`^${escapeRe(s.trim())}$`, "i");

type Id = mongoose.Types.ObjectId;

async function upsertOwnerMembership(
  companyId: Id,
  email: string,
  name: string | null,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  const user = await UserModel.findOne({ email: normalized }).select({ _id: 1 });
  await CompanyMemberModel.updateOne(
    { companyId, email: normalized },
    {
      $setOnInsert: { companyId, email: normalized, name },
      $set: { role: "owner", userId: (user?._id as Id) ?? null },
    },
    { upsert: true },
  );
  if (user) await CompanyModel.updateOne({ _id: companyId }, { $set: { claimed: true } });
}

/** Find an existing non-vendor company by name, or create an unclaimed one. */
async function companyForClient(
  name: string,
  contactEmail: string | null,
  contactName: string | null,
  createdByUserId: Id | null,
): Promise<Id> {
  const clean = name.trim() || "Client";
  const existing = await CompanyModel.findOne({
    name: rxExact(clean),
    
  });
  if (existing) return existing._id as Id;
  const company = await CompanyModel.create({ name: clean, claimed: false, createdByUserId });
  if (contactEmail) await upsertOwnerMembership(company._id as Id, contactEmail, contactName);
  return company._id as Id;
}

async function main() {
  await connectToDatabase();

  // 1. Platform vendor company
  const vendorEmail = SEED_VENDOR_EMAIL;
  const vendorUser = await UserModel.findOne({ email: vendorEmail });

  let deliveringCompany = await CompanyModel.findOne({ name: rxExact(VENDOR_NAME) });
  if (!deliveringCompany) {
    deliveringCompany = await CompanyModel.create({
      name: VENDOR_NAME,
      claimed: true,

      createdByUserId: (vendorUser?._id as Id) ?? null,
    });
  }
  const deliveringCompanyId = deliveringCompany._id as Id;
  if (vendorUser) {
    await upsertOwnerMembership(deliveringCompanyId, vendorUser.email, vendorUser.name ?? null);
  }

  // 2. VendorMember -> CompanyMember (preserve _id)
  let vmMigrated = 0;
  for (const vm of await VendorMemberModel.find({})) {
    if (await CompanyMemberModel.exists({ _id: vm._id })) continue;
    await CompanyMemberModel.collection.insertOne({
      _id: vm._id as Id,
      companyId: deliveringCompanyId,
      email: (vm.email ?? "").toLowerCase(),
      name: vm.name ?? null,
      role: vm.role === "owner" ? "admin" : "member",
      userId: (vm.userId as Id) ?? null,
      createdAt: vm.createdAt ?? new Date(),
      updatedAt: new Date(),
    });
    vmMigrated++;
  }

  // 3. Team.ownerUserId -> companyId
  const teamRes = await TeamModel.updateMany(
    { $or: [{ companyId: null }, { companyId: { $exists: false } }] },
    { $set: { companyId: deliveringCompanyId } },
  );

  // 4. ClientCompany -> Company
  const companyToOrg = new Map<string, Id>();
  for (const cc of await ClientCompanyModel.find({})) {
    const companyId = await companyForClient(
      cc.name ?? "",
      (cc.contactEmail as string) ?? null,
      (cc.contactName as string) ?? null,
      (cc.createdByUserId as Id) ?? null,
    );
    companyToOrg.set(String(cc._id), companyId);
  }

  // 5. Projects
  let projMigrated = 0;
  for (const p of await ProjectModel.find({})) {
    let touched = false;
    if (!p.deliveringCompanyId) {
      p.set("deliveringCompanyId", deliveringCompanyId);
      touched = true;
    }
    if (!p.receivingCompanyId) {
      let recvId = p.clientCompanyId ? companyToOrg.get(String(p.clientCompanyId)) : undefined;
      if (!recvId) {
        recvId = await companyForClient(
          p.clientCompanyName ?? "",
          (p.clientEmail as string) ?? null,
          (p.clientContactName as string) ?? null,
          null,
        );
      }
      p.set("receivingCompanyId", recvId);
      touched = true;
    }
    const recvOrgId = p.receivingCompanyId as Id | undefined;
    if (recvOrgId && Array.isArray(p.clientContacts)) {
      for (const c of p.clientContacts as { email?: string; name?: string | null; userId?: Id; role?: string }[]) {
        if (!c.email) continue;
        await CompanyMemberModel.updateOne(
          { companyId: recvOrgId, email: c.email.toLowerCase() },
          {
            $setOnInsert: {
              companyId: recvOrgId,
              email: c.email.toLowerCase(),
              name: c.name ?? null,
              role: c.role === "primary" ? "owner" : "member",
              userId: c.userId ?? null,
            },
          },
          { upsert: true },
        );
      }
    }
    if (touched) {
      await p.save();
      projMigrated++;
    }
  }

  console.log(
    `Platform company "${deliveringCompany.name}". Migrated ${vmMigrated} member(s), ${teamRes.modifiedCount} team(s), ` +
      `${companyToOrg.size} client compan(y/ies), ${projMigrated} project(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
