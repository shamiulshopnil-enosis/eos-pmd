import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { serializeTeam, serializeVendorMember } from "../common/serialize";
import { str, strList } from "../common/input";
import type { SessionUser, Team, VendorMember } from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);

/** Named groupings of VendorMember ids, owned by one vendor. */
@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(MODEL.Team) private readonly teams: Model<any>,
    @InjectModel(MODEL.VendorMember) private readonly members: Model<any>,
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
  ) {}

  private assertVendor(user: SessionUser): void {
    if (user.role !== "vendor" && user.role !== "admin") {
      throw new ForbiddenException("Only vendors can manage teams.");
    }
  }

  /** Keep only ids that are real directory members owned by this vendor. */
  private async validMemberIds(ownerUserId: string, ids: string[]): Promise<Types.ObjectId[]> {
    const wanted = ids.filter(isValidId).map((id) => new Types.ObjectId(id));
    if (wanted.length === 0) return [];
    const docs = await this.members
      .find({ _id: { $in: wanted }, ownerUserId: new Types.ObjectId(ownerUserId) })
      .select({ _id: 1 })
      .lean();
    return docs.map((d) => d._id as Types.ObjectId);
  }

  private async attachMembers(teamDocs: Record<string, unknown>[]): Promise<Team[]> {
    const memberIds = new Set<string>();
    for (const t of teamDocs) for (const m of (t.memberIds as unknown[]) ?? []) memberIds.add(String(m));
    const memberDocs = memberIds.size
      ? await this.members
          .find({ _id: { $in: [...memberIds].map((id) => new Types.ObjectId(id)) } })
          .sort({ createdAt: 1 })
          .lean()
      : [];
    const byId = new Map<string, VendorMember>(
      memberDocs.map((d) => [String(d._id), serializeVendorMember(d as Record<string, unknown>)]),
    );
    return teamDocs.map((t) => {
      const members = ((t.memberIds as unknown[]) ?? [])
        .map((id) => byId.get(String(id)))
        .filter((m): m is VendorMember => Boolean(m));
      return serializeTeam(t, members);
    });
  }

  async list(user: SessionUser): Promise<Team[]> {
    this.assertVendor(user);
    const docs = await this.teams
      .find({ ownerUserId: new Types.ObjectId(user.id) })
      .sort({ createdAt: 1 })
      .lean();
    return this.attachMembers(docs as Record<string, unknown>[]);
  }

  async create(user: SessionUser, body: Record<string, unknown>): Promise<Team> {
    this.assertVendor(user);
    const name = str(body, "name");
    if (!name) throw new BadRequestException("A team name is required.");
    const memberIds = await this.validMemberIds(user.id, strList(body, "memberIds"));
    const doc = await this.teams.create({
      ownerUserId: new Types.ObjectId(user.id),
      name,
      memberIds,
    });
    const [team] = await this.attachMembers([doc.toObject() as Record<string, unknown>]);
    return team;
  }

  async update(user: SessionUser, id: string, body: Record<string, unknown>): Promise<Team> {
    this.assertVendor(user);
    if (!isValidId(id)) throw new NotFoundException("Team not found.");
    const doc = await this.teams.findOne({ _id: id, ownerUserId: new Types.ObjectId(user.id) });
    if (!doc) throw new NotFoundException("Team not found.");

    if (body.name !== undefined) {
      const name = str(body, "name");
      if (!name) throw new BadRequestException("A team name is required.");
      doc.name = name;
    }
    if (body.memberIds !== undefined) {
      doc.memberIds = await this.validMemberIds(user.id, strList(body, "memberIds"));
    }
    await doc.save();
    const [team] = await this.attachMembers([doc.toObject() as Record<string, unknown>]);
    return team;
  }

  async remove(user: SessionUser, id: string): Promise<void> {
    this.assertVendor(user);
    if (!isValidId(id)) throw new NotFoundException("Team not found.");
    const res = await this.teams.deleteOne({ _id: id, ownerUserId: new Types.ObjectId(user.id) });
    if (res.deletedCount === 0) throw new NotFoundException("Team not found.");
    const oid = new Types.ObjectId(id);
    await this.projects.updateMany({ assignedTeamIds: oid }, { $pull: { assignedTeamIds: oid } });
  }
}
