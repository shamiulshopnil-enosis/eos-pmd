import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { serializeClientCompany } from "../common/serialize";
import { optStr, str } from "../common/input";
import type { ClientCompany, SessionUser } from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Global, shared directory of client companies. Any vendor can search it; a
 * company added once is reusable on every later project (its contact person
 * becomes the project's primary client contact).
 */
@Injectable()
export class ClientCompaniesService {
  constructor(
    @InjectModel(MODEL.ClientCompany) private readonly companies: Model<any>,
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
  ) {}

  private assertVendor(user: SessionUser): void {
    if (user.role !== "vendor" && user.role !== "admin") {
      throw new ForbiddenException("Only vendors can manage client companies.");
    }
  }

  async list(user: SessionUser, q?: string): Promise<ClientCompany[]> {
    this.assertVendor(user);
    const query: Record<string, unknown> = {};
    if (q && q.trim()) query.name = new RegExp(escapeRe(q.trim()), "i");
    const docs = await this.companies.find(query).sort({ name: 1 }).limit(50).lean();
    return docs.map((d) => serializeClientCompany(d as Record<string, unknown>));
  }

  async get(user: SessionUser, id: string): Promise<ClientCompany> {
    this.assertVendor(user);
    if (!isValidId(id)) throw new NotFoundException("Client company not found.");
    const doc = await this.companies.findById(id).lean();
    if (!doc) throw new NotFoundException("Client company not found.");
    return serializeClientCompany(doc as Record<string, unknown>);
  }

  async create(user: SessionUser, body: Record<string, unknown>): Promise<ClientCompany> {
    this.assertVendor(user);
    const name = str(body, "name");
    if (!name) throw new BadRequestException("A company name is required.");
    const contactEmail = str(body, "contactEmail").toLowerCase();
    if (!EMAIL_RE.test(contactEmail)) {
      throw new BadRequestException("Enter a valid contact email address.");
    }
    const existing = await this.companies.findOne({
      name: new RegExp(`^${escapeRe(name)}$`, "i"),
    });
    if (existing) {
      throw new BadRequestException("A client company with that name already exists — search for it.");
    }
    const doc = await this.companies.create({
      name,
      contactName: optStr(body, "contactName"),
      contactEmail,
      designation: optStr(body, "designation") ?? "",
      createdByUserId: new Types.ObjectId(user.id),
    });
    return serializeClientCompany(doc.toObject() as Record<string, unknown>);
  }

  async update(user: SessionUser, id: string, body: Record<string, unknown>): Promise<ClientCompany> {
    this.assertVendor(user);
    if (!isValidId(id)) throw new NotFoundException("Client company not found.");
    const doc = await this.companies.findById(id);
    if (!doc) throw new NotFoundException("Client company not found.");

    if (body.name !== undefined) {
      const name = str(body, "name");
      if (!name) throw new BadRequestException("A company name is required.");
      doc.name = name;
    }
    if (body.contactName !== undefined) doc.contactName = optStr(body, "contactName");
    if (body.contactEmail !== undefined) {
      const contactEmail = str(body, "contactEmail").toLowerCase();
      if (!EMAIL_RE.test(contactEmail)) {
        throw new BadRequestException("Enter a valid contact email address.");
      }
      doc.contactEmail = contactEmail;
    }
    if (body.designation !== undefined) doc.designation = optStr(body, "designation") ?? "";
    await doc.save();
    return serializeClientCompany(doc.toObject() as Record<string, unknown>);
  }

  async remove(user: SessionUser, id: string): Promise<void> {
    this.assertVendor(user);
    if (!isValidId(id)) throw new NotFoundException("Client company not found.");
    const inUse = await this.projects.countDocuments({ clientCompanyId: new Types.ObjectId(id) });
    if (inUse > 0) {
      throw new BadRequestException(
        `This company is linked to ${inUse} project${inUse === 1 ? "" : "s"} and cannot be deleted.`,
      );
    }
    const res = await this.companies.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException("Client company not found.");
  }
}
