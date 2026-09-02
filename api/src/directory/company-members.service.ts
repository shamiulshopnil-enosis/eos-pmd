import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { serializeCompanyMember } from "../common/serialize";
import { optStr, str } from "../common/input";
import type { CompanyMember, SessionUser } from "../common/types";
import { CompaniesService } from "./companies.service";

const isValidId = (id: string) => Types.ObjectId.isValid(id);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class CompanyMembersService {
  constructor(
    @InjectModel(MODEL.CompanyMember) private readonly memberships: Model<any>,
    @InjectModel(MODEL.Team) private readonly teams: Model<any>,
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
    @InjectModel(MODEL.User) private readonly users: Model<any>,
    private readonly companies: CompaniesService,
  ) {}

  async list(user: SessionUser, companyId: string): Promise<CompanyMember[]> {
    await this.companies.requireRole(user, companyId, ["owner", "admin", "member"]);
    const docs = await this.memberships
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ createdAt: 1 })
      .lean();
    return docs.map((d) => serializeCompanyMember(d as Record<string, unknown>));
  }

  async add(user: SessionUser, companyId: string, body: Record<string, unknown>): Promise<CompanyMember> {
    await this.companies.requireRole(user, companyId, ["owner", "admin"]);
    const email = str(body, "email").toLowerCase();
    if (!EMAIL_RE.test(email)) throw new BadRequestException("Enter a valid email address.");
    const role = ["owner", "admin", "member"].includes(str(body, "role"))
      ? (str(body, "role") as CompanyMember["role"])
      : "member";

    const existingUser = (await this.users.findOne({ email }).select({ _id: 1 }).lean()) as {
      _id: unknown;
    } | null;

    try {
      const doc = await this.memberships.create({
        companyId: new Types.ObjectId(companyId),
        email,
        name: optStr(body, "name"),
        role,
        userId: existingUser?._id ?? null,
      });
      return serializeCompanyMember(doc.toObject() as Record<string, unknown>);
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new BadRequestException("That email is already in this company.");
      }
      throw err;
    }
  }

  async update(
    user: SessionUser,
    companyId: string,
    membershipId: string,
    body: Record<string, unknown>,
  ): Promise<CompanyMember> {
    await this.companies.requireRole(user, companyId, ["owner", "admin"]);
    if (!isValidId(membershipId)) throw new NotFoundException("Member not found.");
    const doc = await this.memberships.findOne({
      _id: membershipId,
      companyId: new Types.ObjectId(companyId),
    });
    if (!doc) throw new NotFoundException("Member not found.");

    if (body.name !== undefined) doc.name = optStr(body, "name");
    if (body.role !== undefined) {
      const next = str(body, "role");
      if (!["owner", "admin", "member"].includes(next)) {
        throw new BadRequestException("Invalid role.");
      }
      if (doc.role === "owner" && next !== "owner") {
        await this.assertNotLastOwner(companyId, String(doc._id));
      }
      doc.role = next;
    }
    await doc.save();
    return serializeCompanyMember(doc.toObject() as Record<string, unknown>);
  }

  async remove(user: SessionUser, companyId: string, membershipId: string): Promise<void> {
    await this.companies.requireRole(user, companyId, ["owner", "admin"]);
    if (!isValidId(membershipId)) throw new NotFoundException("Member not found.");
    const doc = await this.memberships.findOne({
      _id: membershipId,
      companyId: new Types.ObjectId(companyId),
    });
    if (!doc) throw new NotFoundException("Member not found.");
    if (doc.role === "owner") await this.assertNotLastOwner(companyId, membershipId);

    await this.memberships.deleteOne({ _id: membershipId });
    const oid = new Types.ObjectId(membershipId);
    await this.teams.updateMany({ memberIds: oid }, { $pull: { memberIds: oid } });
    await this.projects.updateMany(
      { assignedMemberIds: oid },
      { $pull: { assignedMemberIds: oid } },
    );
  }

  private async assertNotLastOwner(companyId: string, membershipId: string): Promise<void> {
    const owners = await this.memberships
      .find({ companyId: new Types.ObjectId(companyId), role: "owner" })
      .select({ _id: 1 })
      .lean();
    if (owners.length <= 1 && owners.some((o) => String(o._id) === membershipId)) {
      throw new BadRequestException("An company must keep at least one owner.");
    }
  }
}
