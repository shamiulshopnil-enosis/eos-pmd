import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MODEL } from "../schemas/schemas";
import type { SessionUser, UserRole } from "../common/types";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(MODEL.User) private readonly users: Model<any>) {}

  /** Find an existing account by email or create a fresh one (ported from auth.ts). */
  async findOrCreate(email: string, role: UserRole = "buyer"): Promise<SessionUser> {
    const normalized = normalizeEmail(email);
    const user = await this.users.findOneAndUpdate(
      { email: normalized },
      { $setOnInsert: { email: normalized, role }, $set: { emailVerified: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return {
      id: String(user!._id),
      email: user!.email,
      name: user!.name ?? null,
      role: user!.role as UserRole,
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
