import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { serializeVendorMember } from "../common/serialize";
import { optStr, str } from "../common/input";
import type { SessionUser, VendorMember } from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The vendor-owned people directory (Team Management feature). Entries are keyed
 * by (ownerUserId, email). `userId` is filled the first time the person signs in
 * with that email — see UsersService.findOrCreate.
 */
@Injectable()
export class VendorMembersService {
  constructor(
    @InjectModel(MODEL.VendorMember) private readonly members: Model<any>,
    @InjectModel(MODEL.Team) private readonly teams: Model<any>,
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
    @InjectModel(MODEL.User) private readonly users: Model<any>,
  ) {}

  private assertVendor(user: SessionUser): void {
    if (user.role !== "vendor" && user.role !== "admin") {
      throw new ForbiddenException("Only vendors can manage the team directory.");
    }
  }

  async list(user: SessionUser): Promise<VendorMember[]> {
    this.assertVendor(user);
    const docs = await this.members
      .find({ ownerUserId: new Types.ObjectId(user.id) })
      .sort({ createdAt: 1 })
      .lean();
    return docs.map((d) => serializeVendorMember(d as Record<string, unknown>));
  }

  async create(user: SessionUser, body: Record<string, unknown>): Promise<VendorMember> {
    this.assertVendor(user);
    const email = str(body, "email").toLowerCase();
    if (!EMAIL_RE.test(email)) throw new BadRequestException("Enter a valid email address.");
    const role = str(body, "role") === "owner" ? "owner" : "member";

    const existingUser = (await this.users.findOne({ email }).select({ _id: 1 }).lean()) as {
      _id: unknown;
    } | null;

    try {
      const doc = await this.members.create({
        ownerUserId: new Types.ObjectId(user.id),
        email,
        name: optStr(body, "name"),
        role,
        userId: existingUser?._id ?? null,
      });
      return serializeVendorMember(doc.toObject() as Record<string, unknown>);
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new BadRequestException("That email is already in your team directory.");
      }
      throw err;
    }
  }

  async update(user: SessionUser, id: string, body: Record<string, unknown>): Promise<VendorMember> {
    this.assertVendor(user);
    if (!isValidId(id)) throw new NotFoundException("Team member not found.");
    const doc = await this.members.findOne({ _id: id, ownerUserId: new Types.ObjectId(user.id) });
    if (!doc) throw new NotFoundException("Team member not found.");

    if (body.name !== undefined) doc.name = optStr(body, "name");
    if (body.role !== undefined) doc.role = str(body, "role") === "owner" ? "owner" : "member";
    await doc.save();
    return serializeVendorMember(doc.toObject() as Record<string, unknown>);
  }

  async remove(user: SessionUser, id: string): Promise<void> {
    this.assertVendor(user);
    if (!isValidId(id)) throw new NotFoundException("Team member not found.");
    const res = await this.members.deleteOne({
      _id: id,
      ownerUserId: new Types.ObjectId(user.id),
    });
    if (res.deletedCount === 0) throw new NotFoundException("Team member not found.");
    const oid = new Types.ObjectId(id);
    await this.teams.updateMany({ memberIds: oid }, { $pull: { memberIds: oid } });
    await this.projects.updateMany(
      { assignedMemberIds: oid },
      { $pull: { assignedMemberIds: oid } },
    );
  }
}
