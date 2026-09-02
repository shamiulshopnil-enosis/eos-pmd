import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import { ClientCompanyModel, ProjectModel, UserModel } from "../../src/lib/models";
import { SEED_VENDOR_EMAIL } from "../seed-users";

// Team Management feature. Backfills the shared Client Company directory from the
// free-text client fields already stored on every project, then links each
// project to its company:
//   npm run migrate:005
// Existing embedded vendorTeam / clientContacts are left untouched (grandfathered
// projects keep working); assignedTeamIds / assignedMemberIds stay empty.
// Safe to re-run — only fills projects that have no clientCompanyId yet.

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function main() {
  await connectToDatabase();

  const vendorEmail = SEED_VENDOR_EMAIL;
  const vendor = await UserModel.findOne({ email: vendorEmail });
  const createdBy = vendor?._id ?? null;

  const projects = await ProjectModel.find({
    $or: [{ clientCompanyId: null }, { clientCompanyId: { $exists: false } }],
  });

  let linked = 0;
  let created = 0;

  for (const p of projects) {
    const name = (p.clientCompanyName ?? "").trim();
    if (!name) continue;

    const contactEmail = (p.clientEmail ?? "").trim().toLowerCase();
    const primary = (p.clientContacts ?? []).find(
      (c: { role?: string }) => c.role === "primary",
    ) as { designation?: string } | undefined;

    let company = await ClientCompanyModel.findOne({
      name: new RegExp(`^${escapeRe(name)}$`, "i"),
    });

    if (!company) {
      company = await ClientCompanyModel.create({
        name,
        contactName: p.clientContactName ?? null,
        contactEmail: contactEmail || `contact@${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`,
        designation: primary?.designation ?? "Client Contact",
        createdByUserId: createdBy,
      });
      created++;
    }

    p.set("clientCompanyId", company._id);
    await p.save();
    linked++;
  }

  console.log(`Created ${created} client compan(y/ies); linked ${linked} project(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
