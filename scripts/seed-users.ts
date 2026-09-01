import { UserModel } from "../src/lib/models";

// The two accounts you sign in with. No email is sent - request a code at
// /login and read it off the screen / server console.
export const SEED_USERS = [
  { email: "admin@eos.local", name: "EOS Admin", role: "admin" as const },
  { email: "vendor@eos.local", name: "Vendor Owner", role: "vendor" as const },
];

/** Idempotent: creates the seed accounts if missing, leaves existing ones (and their ids) intact. */
export async function seedUsers() {
  for (const u of SEED_USERS) {
    await UserModel.findOneAndUpdate(
      { email: u.email },
      { $setOnInsert: { email: u.email, role: u.role }, $set: { name: u.name, emailVerified: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  return SEED_USERS;
}
