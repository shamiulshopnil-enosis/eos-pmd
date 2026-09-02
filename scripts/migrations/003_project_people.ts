import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import { ProjectModel, UserModel } from "../../src/lib/models";
import { SEED_VENDOR_EMAIL } from "../seed-users";

// Milestones plan, Phase 3. Backfills per-project people on existing projects:
//   npm run migrate:003
// - vendorTeam: the seed vendor becomes the founding Owner (if empty)
// - clientContacts: one pending Primary Contact from clientEmail / clientContactName (if empty)
// Safe to re-run - only fills empty arrays.
async function main() {
  await connectToDatabase();

  const vendorEmail = SEED_VENDOR_EMAIL;
  const vendor = await UserModel.findOne({ email: vendorEmail });
  if (!vendor) throw new Error(`Seed vendor ${vendorEmail} not found - run migrate:000 first.`);

  const projects = await ProjectModel.find({});
  let updated = 0;

  for (const p of projects) {
    let touched = false;

    if (!p.vendorTeam || p.vendorTeam.length === 0) {
      p.vendorTeam.push({
        userId: vendor._id as never,
        email: vendor.email,
        name: vendor.name,
        role: "owner",
        invitePending: false,
      } as never);
      touched = true;
    }

    if ((!p.clientContacts || p.clientContacts.length === 0) && p.clientEmail) {
      p.clientContacts.push({
        userId: null,
        email: p.clientEmail.toLowerCase(),
        name: p.clientContactName ?? null,
        designation: "Client Contact",
        role: "primary",
        invitePending: true,
      } as never);
      touched = true;
    }

    if (touched) {
      await p.save();
      updated++;
    }
  }

  console.log(`Updated ${updated} project(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
