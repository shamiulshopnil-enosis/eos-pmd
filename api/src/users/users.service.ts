import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import type { SessionUser, UserRole } from "../common/types";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(MODEL.User) private readonly users: Model<any>,
    @InjectModel(MODEL.CompanyMember) private readonly memberships: Model<any>,
    @InjectModel(MODEL.Company) private readonly companies: Model<any>,
  ) {}

  /** Find an existing account by email or create a fresh one (ported from auth.ts). */
  async findOrCreate(email: string, role: UserRole = "member"): Promise<SessionUser> {
    const normalized = normalizeEmail(email);
    const user = await this.users.findOneAndUpdate(
      { email: normalized },
      { $setOnInsert: { email: normalized, role }, $set: { emailVerified: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const userId = String(user!._id);

    // Company-model unification: link every unclaimed membership for this email to the
    // account and mark those companies claimed. This is how someone "joins" — no
    // per-project invite.
    await this.memberships.updateMany(
      { email: normalized, userId: null },
      { $set: { userId: user!._id } },
    );
    const myCompanyIds = (
      await this.memberships.find({ email: normalized }).select({ companyId: 1 }).lean()
    ).map((m) => m.companyId as Types.ObjectId);
    if (myCompanyIds.length > 0) {
      await this.companies.updateMany({ _id: { $in: myCompanyIds } }, { $set: { claimed: true } });
    }

    return {
      id: userId,
      email: user!.email,
      name: user!.name ?? null,
      role: (user!.role === "admin" ? "admin" : "member") as UserRole,
    };
  }

  async setRole(userId: string, role: UserRole): Promise<void> {
    await this.users.updateOne({ _id: userId }, { $set: { role } });
  }

  async byId(userId: string): Promise<SessionUser | null> {
    const user = (await this.users.findById(userId).lean()) as Record<string, any> | null;
    if (!user) return null;
    return {
      id: String(user._id),
      email: String(user.email),
      name: (user.name as string | null) ?? null,
      role: user.role as UserRole,
    };
  }
}
