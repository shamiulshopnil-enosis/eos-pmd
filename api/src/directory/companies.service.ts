import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { serializeCompany } from "../common/serialize";
import { str } from "../common/input";
import type { Company, CompanyRole, SessionUser } from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Companies (company-unification PR1). One entity per company; delivering or
 * receiving per project. There is no company-creation UI — an company only appears as a
 * stub created while making a project. Ownership is one or more memberships with
 * `role: "owner"`.
 */
@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(MODEL.Company) private readonly companies: Model<any>,
    @InjectModel(MODEL.CompanyMember) private readonly memberships: Model<any>,
    @InjectModel(MODEL.User) private readonly users: Model<any>,
  ) {}

  async getRaw(companyId: string): Promise<Record<string, any> | null> {
    if (!isValidId(companyId)) return null;
    return (await this.companies.findById(companyId).lean()) as Record<string, any> | null;
  }

  async getOrThrow(companyId: string): Promise<Company> {
    const doc = await this.getRaw(companyId);
    if (!doc) throw new NotFoundException("Company not found.");
    return serializeCompany(doc);
  }

  /** The membership row for a user in an company, or null. */
  async membershipOf(user: SessionUser, companyId: string): Promise<{ role: CompanyRole } | null> {
    if (!isValidId(companyId)) return null;
    const m = (await this.memberships
      .findOne({ companyId: new Types.ObjectId(companyId), userId: new Types.ObjectId(user.id) })
      .select({ role: 1 })
      .lean()) as { role?: unknown } | null;
    return m ? { role: (m.role as CompanyRole) ?? "member" } : null;
  }

  /** Company ids the user is a member of. */
  async companyIdsForUser(userId: string): Promise<string[]> {
    if (!isValidId(userId)) return [];
    const rows = await this.memberships
      .find({ userId: new Types.ObjectId(userId) })
      .select({ companyId: 1 })
      .lean();
    return rows.map((r) => String(r.companyId));
  }

  /**
   * The company a request acts on. With `companyId` given it must be one the user
   * belongs to. Otherwise it resolves to the user's single membership.
   */
  async resolveActingCompany(user: SessionUser, companyId?: string): Promise<string> {
    const mine = await this.companyIdsForUser(user.id);
    if (companyId) {
      if (!mine.includes(companyId)) {
        throw new ForbiddenException("You are not a member of that company.");
      }
      return companyId;
    }
    if (mine.length === 0) {
      throw new ForbiddenException("You do not belong to any company yet.");
    }
    if (mine.length > 1) {
      throw new BadRequestException("You belong to several companies — specify which (companyId).");
    }
    return mine[0];
  }

  async requireRole(user: SessionUser, companyId: string, roles: CompanyRole[]): Promise<void> {
    const m = await this.membershipOf(user, companyId);
    if (!m || !roles.includes(m.role)) {
      throw new ForbiddenException("You do not have permission to do that in this company.");
    }
  }

  async listMine(user: SessionUser): Promise<Company[]> {
    const ids = (await this.companyIdsForUser(user.id)).filter(isValidId).map((id) => new Types.ObjectId(id));
    if (ids.length === 0) return [];
    const docs = await this.companies.find({ _id: { $in: ids } }).sort({ name: 1 }).lean();
    return docs.map((d) => serializeCompany(d as Record<string, unknown>));
  }

  /** Name search across every company — the client-company directory replacement. */
  async search(q?: string): Promise<
    (Company & { primaryContact: { name: string | null; email: string } | null })[]
  > {
    const query: Record<string, unknown> = {};
    if (q && q.trim()) query.name = new RegExp(escapeRe(q.trim()), "i");
    const docs = await this.companies.find(query).sort({ name: 1 }).limit(50).lean();
    const ids = docs.map((d) => d._id as Types.ObjectId);
    const owners = ids.length
      ? await this.memberships
          .find({ companyId: { $in: ids }, role: "owner" })
          .sort({ createdAt: 1 })
          .lean()
      : [];
    const ownerByOrg = new Map<string, { name: string | null; email: string }>();
    for (const o of owners) {
      const k = String(o.companyId);
      if (!ownerByOrg.has(k)) ownerByOrg.set(k, { name: o.name ?? null, email: String(o.email) });
    }
    return docs.map((d) => ({
      ...serializeCompany(d as Record<string, unknown>),
      primaryContact: ownerByOrg.get(String(d._id)) ?? null,
    }));
  }

  /**
   * Create a stub company for a new project's receiving side and seed one
   * invite-pending owner membership from the given contact. If a user already
   * exists for the contact email the membership is linked (and the company claimed).
   */
  async createStub(
    creator: SessionUser,
    input: { name: string; contactName?: string | null; contactEmail: string },
  ): Promise<Company> {
    const name = input.name.trim();
    if (!name) throw new BadRequestException("An company name is required.");
    const email = input.contactEmail.trim().toLowerCase();
    const existingUser = (await this.users.findOne({ email }).select({ _id: 1 }).lean()) as {
      _id: unknown;
    } | null;
    const linkedUserId = existingUser?._id ? new Types.ObjectId(String(existingUser._id)) : null;

    const company = await this.companies.create({
      name,
      claimed: linkedUserId != null,
      createdByUserId: new Types.ObjectId(creator.id),
    });
    await this.memberships.create({
      companyId: company._id,
      email,
      name: input.contactName ?? null,
      role: "owner",
      userId: linkedUserId,
    });
    return serializeCompany(company.toObject() as Record<string, unknown>);
  }

  /** The first owner membership of an company (its primary contact). */
  async primaryContact(
    companyId: string,
  ): Promise<{ name: string | null; email: string } | null> {
    if (!isValidId(companyId)) return null;
    const m = (await this.memberships
      .findOne({ companyId: new Types.ObjectId(companyId), role: "owner" })
      .sort({ createdAt: 1 })
      .lean()) as Record<string, any> | null;
    return m ? { name: (m.name as string | null) ?? null, email: String(m.email) } : null;
  }

  async update(user: SessionUser, companyId: string, body: Record<string, unknown>): Promise<Company> {
    await this.requireRole(user, companyId, ["owner", "admin"]);
    const doc = await this.companies.findById(companyId);
    if (!doc) throw new NotFoundException("Company not found.");
    if (body.name !== undefined) {
      const name = str(body, "name");
      if (!name) throw new BadRequestException("An company name is required.");
      doc.name = name;
    }
    await doc.save();
    return serializeCompany(doc.toObject() as Record<string, unknown>);
  }
}
