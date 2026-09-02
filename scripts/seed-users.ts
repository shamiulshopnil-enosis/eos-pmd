import { UserModel } from "../src/lib/models";

// The two accounts you sign in with. No email is sent - request a code at
// /login and read it off the screen / server console.
export const SEED_ADMIN_EMAIL = "admin@eos.local";
/** The founding owner of the seeded delivering company (VENDOR_NAME). */
export const SEED_VENDOR_EMAIL = "vendor@eos.local";

export const SEED_USERS = [
  { email: SEED_ADMIN_EMAIL, name: "EOS Admin", role: "admin" as const },
  { email: SEED_VENDOR_EMAIL, name: "Workspace Owner", role: "member" as const },
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
