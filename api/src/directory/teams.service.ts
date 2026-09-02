import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { serializeCompanyMember, serializeTeam } from "../common/serialize";
import { str, strList } from "../common/input";
import type { CompanyMember, SessionUser, Team } from "../common/types";
import { CompaniesService } from "./companies.service";

const isValidId = (id: string) => Types.ObjectId.isValid(id);

/** Named groupings of CompanyMember ids, owned by one company. */
@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(MODEL.Team) private readonly teams: Model<any>,
    @InjectModel(MODEL.CompanyMember) private readonly members: Model<any>,
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
    private readonly companies: CompaniesService,
  ) {}

  /** Keep only ids that are real members of this company. */
  private async validMemberIds(companyId: string, ids: string[]): Promise<Types.ObjectId[]> {
    const wanted = ids.filter(isValidId).map((id) => new Types.ObjectId(id));
    if (wanted.length === 0) return [];
    const docs = await this.members
      .find({ _id: { $in: wanted }, companyId: new Types.ObjectId(companyId) })
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
    const byId = new Map<string, CompanyMember>(
      memberDocs.map((d) => [String(d._id), serializeCompanyMember(d as Record<string, unknown>)]),
    );
    return teamDocs.map((t) => {
      const members = ((t.memberIds as unknown[]) ?? [])
        .map((id) => byId.get(String(id)))
        .filter((m): m is CompanyMember => Boolean(m));
      return serializeTeam(t, members);
    });
  }

  async list(user: SessionUser, companyIdParam?: string): Promise<Team[]> {
    const companyId = await this.companies.resolveActingCompany(user, companyIdParam);
    const docs = await this.teams
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ createdAt: 1 })
      .lean();
    return this.attachMembers(docs as Record<string, unknown>[]);
  }

  async create(user: SessionUser, body: Record<string, unknown>): Promise<Team> {
    const companyId = await this.companies.resolveActingCompany(user, str(body, "companyId") || undefined);
    await this.companies.requireRole(user, companyId, ["owner", "admin"]);
    const name = str(body, "name");
    if (!name) throw new BadRequestException("A team name is required.");
    const memberIds = await this.validMemberIds(companyId, strList(body, "memberIds"));
    const doc = await this.teams.create({ companyId: new Types.ObjectId(companyId), name, memberIds });
    const [team] = await this.attachMembers([doc.toObject() as Record<string, unknown>]);
    return team;
  }

  async update(user: SessionUser, id: string, body: Record<string, unknown>): Promise<Team> {
    if (!isValidId(id)) throw new NotFoundException("Team not found.");
    const doc = await this.teams.findById(id);
    if (!doc) throw new NotFoundException("Team not found.");
    const companyId = String(doc.companyId);
    await this.companies.requireRole(user, companyId, ["owner", "admin"]);

    if (body.name !== undefined) {
      const name = str(body, "name");
      if (!name) throw new BadRequestException("A team name is required.");
      doc.name = name;
    }
    if (body.memberIds !== undefined) {
      doc.memberIds = await this.validMemberIds(companyId, strList(body, "memberIds"));
    }
    await doc.save();
    const [team] = await this.attachMembers([doc.toObject() as Record<string, unknown>]);
    return team;
  }

  async remove(user: SessionUser, id: string): Promise<void> {
    if (!isValidId(id)) throw new NotFoundException("Team not found.");
    const doc = await this.teams.findById(id);
    if (!doc) throw new NotFoundException("Team not found.");
    await this.companies.requireRole(user, String(doc.companyId), ["owner", "admin"]);

    await this.teams.deleteOne({ _id: id });
    const oid = new Types.ObjectId(id);
    await this.projects.updateMany({ assignedTeamIds: oid }, { $pull: { assignedTeamIds: oid } });
  }
}
