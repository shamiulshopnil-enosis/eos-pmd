import mongoose from "mongoose";
import { connectToDatabase } from "../../src/lib/mongoose";
import { CompanyModel, UserModel } from "../../src/lib/models";

// Company-model unification PR3. Collapses User.role to "admin" | "member" (everyone who
// was "buyer" or "vendor" becomes "member") and drops the transitional
// `isPlatformVendor` flag from companies.
//   npm run migrate:009
// Safe to re-run.

async function main() {
  await connectToDatabase();

  const roleRes = await UserModel.updateMany(
    { role: { $in: ["buyer", "vendor"] } },
    { $set: { role: "member" } },
  );
  const companyRes = await CompanyModel.updateMany(
    { isPlatformVendor: { $exists: true } },
    { $unset: { isPlatformVendor: "" } },
  );

  console.log(
    `Narrowed ${roleRes.modifiedCount} user role(s) to "member"; ` +
      `cleared isPlatformVendor on ${companyRes.modifiedCount} company(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
