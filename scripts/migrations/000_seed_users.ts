import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import { seedUsers } from "../seed-users";

// Milestones plan, Phase 0. Run against an existing database without wiping it:
//   npm run migrate:000
// Safe to re-run.
async function main() {
  await connectToDatabase();
  const users = await seedUsers();
  console.log("Seeded users:");
  for (const u of users) console.log(`  ${u.email} (${u.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
