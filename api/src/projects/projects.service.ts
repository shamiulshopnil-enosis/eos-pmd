import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { MODEL } from "../schemas/schemas";
import { ActivityService } from "../activity/activity.service";
import { UsersService } from "../users/users.service";
import { CompaniesService } from "../directory/companies.service";
import {
  serializeActivity,
  serializeInvitation,
  serializeMilestone,
  serializeProject,
} from "../common/serialize";
import { runningAverage } from "../common/scoring";
import { sanitizeMilestoneHtml } from "../common/richtext";
import { minReviewThreshold, COMPLETION_TIMEOUT_DAYS, RATING_SELF_CORRECTION_HOURS } from "../common/constants";
import { CAPSTONE_ATTRIBUTE_POOL, MAX_CAPSTONE_ATTRIBUTES, tierForScore } from "../common/attributes";
import {
  access,
  assertPermission,
  canConfirmCompletion,
  canManageProject,
  canManageReviewStaffing,
  canRequestCapstone,
  canSubmitCapstone,
} from "../common/permissions";
import { bool, optDate, optInt, optStr, str, strList } from "../common/input";
import type {
  ActivityWithMilestoneName,
  CapstoneTier,
  ClientContact,
  Milestone,
  CompanyRole,
  Project,
  ProjectAccess,
  ProjectWithMilestones,
  SessionUser,
  VendorTeamMember,
} from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);
const toObjectIds = (ids: string[]) =>
  ids.filter(isValidId).map((id) => new Types.ObjectId(id));

const toDate = (v: unknown): Date | null => {
  if (typeof v !== "string" || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Milestones added inline on the new-project form. The client serialises them
 * into a `milestonesJson` field: `[{title, startDate?, dueDate?, description?}]`.
 * Only rows with a title survive.
 */
function parseInlineMilestones(
  body: Record<string, unknown>,
): { title: string; description: string; startDate: Date | null; dueDate: Date | null }[] {
  const raw = body["milestonesJson"];
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return {
        title: typeof row.title === "string" ? row.title.trim() : "",
        description: typeof row.description === "string" ? row.description : "",
        startDate: toDate(row.startDate),
        dueDate: toDate(row.dueDate),
      };
    })
    .filter((m) => m.title !== "");
}

/**
 * Merge people resolved from the company model with any legacy embedded rows.
 * Company-resolved rows win on an email clash (they carry current userId / role);
 * stored rows only fill emails the company model doesn't cover (pure grandfathering).
 */
function mergeByEmail<T extends { email: string }>(stored: T[], resolved: T[]): T[] {
  const byEmail = new Map<string, T>();
  for (const s of stored) byEmail.set(s.email.toLowerCase(), s);
  for (const r of resolved) byEmail.set(r.email.toLowerCase(), r);
  return [...byEmail.values()];
}
const mergeVendorTeam = (s: VendorTeamMember[], r: VendorTeamMember[]) => mergeByEmail(s, r);
const mergeClientContacts = (s: ClientContact[], r: ClientContact[]) => mergeByEmail(s, r);

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
    @InjectModel(MODEL.Milestone) private readonly milestones: Model<any>,
    @InjectModel(MODEL.Activity) private readonly activities: Model<any>,
    @InjectModel(MODEL.Invitation) private readonly invitations: Model<any>,
    @InjectModel(MODEL.CompanyMember) private readonly companyMembers: Model<any>,
    private readonly activity: ActivityService,
    private readonly users: UsersService,
    private readonly companies: CompaniesService,
  ) {}

  // -------------------------------------------------------------------------
  // assembly helpers (ported from data.ts)
  // -------------------------------------------------------------------------

  private async attachMilestones(projects: Project[]): Promise<ProjectWithMilestones[]> {
    const projectIds = projects.map((p) => p.id);
    const milestoneDocs = await this.milestones
      .find({ projectId: { $in: projectIds } })
      .sort({ createdAt: 1 })
      .lean();
    const milestones = milestoneDocs.map((m) => serializeMilestone(m as Record<string, unknown>));

    const byProject = new Map<string, Milestone[]>();
    for (const milestone of milestones) {
      const list = byProject.get(milestone.projectId) ?? [];
      list.push(milestone);
      byProject.set(milestone.projectId, list);
    }
    return projects.map((p) => ({ ...p, milestones: byProject.get(p.id) ?? [] }));
  }

  private companyMemberToTeamMember(m: Record<string, any>): VendorTeamMember {
    return {
      userId: m.userId ? String(m.userId) : null,
      email: String(m.email),
      name: m.name ?? null,
      // map company role -> the legacy vendorTeam enum for existing UI badges
      role: m.role === "owner" || m.role === "admin" ? "owner" : "member",
      invitePending: m.userId == null,
    };
  }

  /**
   * Resolve each project's effective people from the company model (company-unification
   * PR2) and, when a `user` is given, compute their `myAccess`:
   *  - `vendorTeam`   = delivering-company owners/admins + people assigned to
   *                     the project on the delivery side
   *  - `clientContacts` = receiving-company owners/admins + people assigned to
   *                     the project on the review side
   * Legacy embedded `vendorTeam` / `clientContacts` rows are merged in so
   * grandfathered projects still render.
   */
  private async hydrateProjectPeople<T extends Project>(
    projects: T[],
    user?: SessionUser,
  ): Promise<T[]> {
    const memberIds = new Set<string>();
    const companyIds = new Set<string>();
    for (const p of projects) {
      for (const id of [...(p.assignedMemberIds ?? []), ...(p.receivingMemberIds ?? [])])
        memberIds.add(id);
      if (p.deliveringCompanyId) companyIds.add(p.deliveringCompanyId);
      if (p.receivingCompanyId) companyIds.add(p.receivingCompanyId);
    }

    // Every membership we might need: assigned individuals, plus all
    // owners/admins of the two companies.
    const membershipDocs: Record<string, any>[] = [];
    if (memberIds.size) {
      membershipDocs.push(
        ...((await this.companyMembers
          .find({ _id: { $in: toObjectIds([...memberIds]) } })
          .lean()) as Record<string, any>[]),
      );
    }
    if (companyIds.size) {
      membershipDocs.push(
        ...((await this.companyMembers
          .find({ companyId: { $in: toObjectIds([...companyIds]) }, role: { $in: ["owner", "admin"] } })
          .lean()) as Record<string, any>[]),
      );
    }
    const memberById = new Map<string, Record<string, any>>();
    const membersByCompany = new Map<string, Record<string, any>[]>();
    for (const m of membershipDocs) {
      memberById.set(String(m._id), m);
      const k = String(m.companyId);
      (membersByCompany.get(k) ?? membersByCompany.set(k, []).get(k)!).push(m);
    }

    const resolveSide = (
      companyId: string | null,
      sideMemberIds: string[],
    ): { people: VendorTeamMember[]; myRole: string | null; assigned: boolean } => {
      const wanted = new Set<string>(sideMemberIds);
      const seen = new Set<string>();
      const people: VendorTeamMember[] = [];
      const push = (m: Record<string, any>) => {
        const key = String(m.email).toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        people.push(this.companyMemberToTeamMember(m));
      };
      for (const m of companyId ? membersByCompany.get(companyId) ?? [] : []) push(m);
      for (const mid of wanted) {
        const m = memberById.get(mid);
        if (m) push(m);
      }
      let myMembershipId: string | null = null;
      let myRole: string | null = null;
      if (user && companyId) {
        for (const m of membershipDocs) {
          if (String(m.companyId) === companyId && m.userId && String(m.userId) === user.id) {
            myMembershipId = String(m._id);
            myRole = String(m.role);
            break;
          }
        }
      }
      return { people, myRole, assigned: myMembershipId != null && wanted.has(myMembershipId) };
    };

    return projects.map((p) => {
      const delivery = resolveSide(p.deliveringCompanyId, p.assignedMemberIds ?? []);
      const review = resolveSide(p.receivingCompanyId, p.receivingMemberIds ?? []);

      const out: T = {
        ...p,
        vendorTeam: mergeVendorTeam(p.vendorTeam, delivery.people),
        clientContacts: mergeClientContacts(
          p.clientContacts,
          review.people.map((x) => ({
            userId: x.userId,
            email: x.email,
            name: x.name,
            designation: x.role === "owner" ? "Primary Contact" : "Contact",
            role: x.role === "owner" ? "primary" : "collaborator",
            invitePending: x.invitePending,
          })),
        ),
      };
      if (user) {
        out.myAccess = {
          deliveryRole: (delivery.myRole as CompanyRole | null) ?? null,
          reviewRole: (review.myRole as CompanyRole | null) ?? null,
          assignedDelivery: delivery.assigned,
          assignedReview: review.assigned,
        };
      }
      return out;
    });
  }

  /**
   * Ids of every project the user can access on the given side(s).
   * Owners/admins of a company reach all its projects; plain members reach only
   * projects they're individually assigned to. Legacy embedded rows are still
   * matched for grandfathered projects.
   */
  async projectIdsForUser(
    userId?: string,
    side: "delivery" | "review" | "any" = "any",
  ): Promise<Types.ObjectId[] | null> {
    if (!userId || !isValidId(userId)) return null;
    const uid = new Types.ObjectId(userId);

    const myMemberships = (await this.companyMembers
      .find({ userId: uid })
      .select({ _id: 1, companyId: 1, role: 1 })
      .lean()) as Record<string, any>[];
    const leadCompanyIds = myMemberships
      .filter((m) => m.role === "owner" || m.role === "admin")
      .map((m) => m.companyId as Types.ObjectId);
    const myMemberIds = myMemberships.map((m) => m._id as Types.ObjectId);

    const deliveryOr: Record<string, unknown>[] = [{ "vendorTeam.userId": uid }];
    const reviewOr: Record<string, unknown>[] = [{ "clientContacts.userId": uid }];
    if (leadCompanyIds.length) {
      deliveryOr.push({ deliveringCompanyId: { $in: leadCompanyIds } });
      reviewOr.push({ receivingCompanyId: { $in: leadCompanyIds } });
    }
    if (myMemberIds.length) {
      deliveryOr.push({ assignedMemberIds: { $in: myMemberIds } });
      reviewOr.push({ receivingMemberIds: { $in: myMemberIds } });
    }

    const or =
      side === "delivery" ? deliveryOr : side === "review" ? reviewOr : [...deliveryOr, ...reviewOr];
    const docs = await this.projects.find({ $or: or }).select({ _id: 1 }).lean();
    return docs.map((d) => d._id as Types.ObjectId);
  }

  /** @deprecated kept for callers not yet migrated — delegates to projectIdsForUser. */
  projectIdsForVendor(vendorUserId?: string): Promise<Types.ObjectId[] | null> {
    return this.projectIdsForUser(vendorUserId, "delivery");
  }

  // -------------------------------------------------------------------------
  // reads (ported from data.ts)
  // -------------------------------------------------------------------------

  async countProjects(userId?: string): Promise<number> {
    const ids = await this.projectIdsForUser(userId, "delivery");
    return this.projects.countDocuments(ids ? { _id: { $in: ids } } : {});
  }

  async listProjectsWithMilestones(filter: {
    status?: string;
    q?: string;
    userId?: string;
    side?: "delivery" | "review" | "any";
  } = {}): Promise<ProjectWithMilestones[]> {
    const clauses: Record<string, unknown>[] = [];
    const ids = await this.projectIdsForUser(filter.userId, filter.side ?? "delivery");
    if (ids) clauses.push({ _id: { $in: ids } });
    if (filter.status) clauses.push({ status: filter.status });
    if (filter.q) {
      const rx = new RegExp(filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      clauses.push({ $or: [{ name: rx }, { clientCompanyName: rx }] });
    }
    const query = clauses.length ? { $and: clauses } : {};
    const projectDocs = await this.projects.find(query).sort({ updatedAt: -1 }).lean();
    const projects = projectDocs.map((p) => serializeProject(p as Record<string, unknown>));
    return this.attachMilestones(await this.hydrateProjectPeople(projects));
  }

  async listProjectsForUser(user: SessionUser): Promise<ProjectWithMilestones[]> {
    const ids = await this.projectIdsForUser(user.id, "review");
    if (!ids || ids.length === 0) return [];
    const docs = await this.projects.find({ _id: { $in: ids } }).sort({ updatedAt: -1 }).lean();
    const projects = docs.map((p) => serializeProject(p as Record<string, unknown>));
    return this.attachMilestones(await this.hydrateProjectPeople(projects, user));
  }

  async getProject(id: string, user?: SessionUser): Promise<Project | null> {
    if (!isValidId(id)) return null;
    const doc = await this.projects.findById(id).lean();
    if (!doc) return null;
    const [hydrated] = await this.hydrateProjectPeople(
      [serializeProject(doc as Record<string, unknown>)],
      user,
    );
    return hydrated;
  }

  async getProjectOrThrow(id: string, user?: SessionUser): Promise<Project> {
    const project = await this.getProject(id, user);
    if (!project) throw new NotFoundException("Project not found.");
    return project;
  }

  async listProjectsForAdmin(filter: { adminStatus?: string } = {}): Promise<Project[]> {
    const query: Record<string, unknown> = {};
    if (filter.adminStatus) query.adminStatus = filter.adminStatus;
    const docs = await this.projects.find(query).sort({ updatedAt: -1 }).lean();
    return this.hydrateProjectPeople(docs.map((p) => serializeProject(p as Record<string, unknown>)));
  }

  async listProjectsAwaitingCompletionTimeout(timeoutDays: number): Promise<Project[]> {
    const cutoff = new Date(Date.now() - timeoutDays * 24 * 60 * 60 * 1000);
    const docs = await this.projects
      .find({ executionStatus: "awaiting_completion", completionRequestedAt: { $lte: cutoff } })
      .sort({ completionRequestedAt: 1 })
      .lean();
    return this.hydrateProjectPeople(docs.map((p) => serializeProject(p as Record<string, unknown>)));
  }

  async getProjectWithMilestones(id: string, user?: SessionUser): Promise<ProjectWithMilestones | null> {
    const project = await this.getProject(id, user);
    if (!project) return null;
    const [withMilestones] = await this.attachMilestones([project]);
    return withMilestones;
  }

  async getProjectDetail(
    id: string,
    user?: SessionUser,
  ): Promise<(ProjectWithMilestones & { activities: ActivityWithMilestoneName[] }) | null> {
    const withMilestones = await this.getProjectWithMilestones(id, user);
    if (!withMilestones) return null;

    const activityDocs = await this.activities
      .find({ projectId: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const activities = activityDocs.map((a) => serializeActivity(a as Record<string, unknown>));

    const titleById = new Map(withMilestones.milestones.map((m) => [m.id, m.title] as const));
    const activitiesWithMilestone: ActivityWithMilestoneName[] = activities.map((a) => ({
      ...a,
      milestone:
        a.milestoneId && titleById.has(a.milestoneId) ? { title: titleById.get(a.milestoneId)! } : null,
    }));

    return { ...withMilestones, activities: activitiesWithMilestone };
  }

  async listPendingInvitations(projectId: string) {
    if (!isValidId(projectId)) return [];
    const docs = await this.invitations
      .find({ projectId, status: "pending" })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => serializeInvitation(d as Record<string, unknown>));
  }

  // -------------------------------------------------------------------------
  // shared write helpers (ported from actions.ts)
  // -------------------------------------------------------------------------

  /** Load the project (with the user's `myAccess`) and enforce a check on it. */
  async requirePermission(
    projectId: string,
    user: SessionUser,
    check: (a: ProjectAccess) => boolean,
    message?: string,
  ): Promise<Project> {
    const project = await this.getProjectOrThrow(projectId, user);
    if (user.role !== "admin") assertPermission(check(access(project.myAccess)), message);
    return project;
  }

  /** Keep the project's stored score fields in sync (spec §6.6). */
  async recomputeProjectScore(projectId: string): Promise<void> {
    const milestones = await this.milestones.find({ projectId }).select("status rating").lean();
    const reviewed = milestones.filter((m) => m.status === "reviewed" && m.rating != null);
    await this.projects.updateOne(
      { _id: projectId },
      {
        $set: {
          liveScore: runningAverage(
            milestones as unknown as { status: string; rating?: number | null }[],
          ),
          reviewedMilestoneCount: reviewed.length,
          minReviewThreshold: minReviewThreshold(milestones.length),
        },
      },
    );
  }

  assertActiveProject(project: Project): void {
    if (project.executionStatus === "completed") {
      throw new BadRequestException(
        "This project is completed. Its milestones and ratings are locked.",
      );
    }
  }

  // -------------------------------------------------------------------------
  // project writes (ported from actions.ts)
  // -------------------------------------------------------------------------

  /**
   * Resolve the receiving company for a new project: an existing company picked
   * by id, or a stub created inline from `newCompany*` (legacy free-text
   * `clientCompanyName` fields are still accepted).
   */
  private async resolveReceivingCompany(
    user: SessionUser,
    body: Record<string, unknown>,
  ): Promise<{
    companyId: string;
    name: string;
    contactEmail: string;
    contactName: string | null;
    designation: string;
  }> {
    const designation =
      optStr(body, "newCompanyDesignation") ?? optStr(body, "contactDesignation") ?? "Client Contact";

    const pickedId = optStr(body, "receivingCompanyId") ?? optStr(body, "clientCompanyId");
    if (pickedId) {
      const company = await this.companies.getOrThrow(pickedId);
      const contact = await this.companies.primaryContact(pickedId);
      return {
        companyId: company.id,
        name: company.name,
        contactEmail: contact?.email ?? str(body, "clientEmail").toLowerCase(),
        contactName: contact?.name ?? optStr(body, "clientContactName"),
        designation,
      };
    }

    const newName =
      optStr(body, "newCompanyName") ?? optStr(body, "clientCompanyName");
    const contactEmail = (
      optStr(body, "newCompanyContactEmail") ?? str(body, "clientEmail")
    ).toLowerCase();
    const contactName =
      optStr(body, "newCompanyContactName") ?? optStr(body, "clientContactName");
    if (!newName) throw new BadRequestException("Select or add a client company.");
    if (!contactEmail) throw new BadRequestException("The client company needs a contact email.");

    const company = await this.companies.createStub(user, { name: newName, contactName, contactEmail });
    return { companyId: company.id, name: company.name, contactEmail, contactName, designation };
  }

  /** Keep only ids that are real members of the given company. */
  private async ownedMemberIds(companyId: string, memberIds: string[]): Promise<Types.ObjectId[]> {
    const memberOids = toObjectIds(memberIds);
    if (memberOids.length === 0) return [];
    const members = await this.companyMembers
      .find({ _id: { $in: memberOids }, companyId: new Types.ObjectId(companyId) })
      .select({ _id: 1 })
      .lean();
    return members.map((m) => m._id as Types.ObjectId);
  }

  async createProject(user: SessionUser, body: Record<string, unknown>): Promise<{ id: string }> {
    // Anyone in an company can start a project their company delivers.
    const deliveringCompanyId = await this.companies.resolveActingCompany(
      user,
      optStr(body, "deliveringCompanyId") ?? undefined,
    );
    const company = await this.resolveReceivingCompany(user, body);
    if (company.companyId === deliveringCompanyId) {
      throw new BadRequestException("A project's client company must differ from your own.");
    }

    const assignedMemberIds = await this.ownedMemberIds(
      deliveringCompanyId,
      strList(body, "memberIds"),
    );

    const project = await this.projects.create({
      name: str(body, "name"),
      clientCompanyName: company.name,
      deliveringCompanyId: new Types.ObjectId(deliveringCompanyId),
      receivingCompanyId: new Types.ObjectId(company.companyId),
      clientContactName: company.contactName,
      clientEmail: company.contactEmail,
      services: optStr(body, "services"),
      description: optStr(body, "description"),
      startDate: optDate(body, "startDate"),
      expectedCompletionDate: optDate(body, "expectedCompletionDate"),
      teamSize: optInt(body, "teamSize"),
      engagementModel: optStr(body, "engagementModel"),
      internalRef: optStr(body, "internalRef"),
      projectUrl: optStr(body, "projectUrl"),
      projectType: str(body, "projectType") === "whole" ? "whole" : "milestone",
      assignedMemberIds,
      vendorTeam: [
        { userId: user.id, email: user.email, name: user.name, role: "owner", invitePending: false },
      ],
    });

    const projectId = String(project._id);

    const teammateEmail = optStr(body, "teammateEmail");
    if (teammateEmail) {
      const email = teammateEmail.toLowerCase();
      const role = str(body, "teammateRole") === "owner" ? "owner" : "member";
      await this.invitations.create({
        email,
        projectId,
        kind: "vendor_team",
        proposedRole: role,
        invitedByUserId: user.id,
      });
      project.vendorTeam.push({ userId: null, email, name: null, role, invitePending: true });
    }

    if (company.contactEmail) {
      const email = company.contactEmail;
      const designation = company.designation || "Client Contact";
      await this.invitations.create({
        email,
        projectId,
        kind: "client_contact",
        proposedRole: "primary",
        designation,
        invitedByUserId: user.id,
      });
      project.clientContacts.push({
        userId: null,
        email,
        name: company.contactName,
        designation,
        role: "primary",
        invitePending: true,
      });
    }

    await project.save();

    if (project.projectType === "whole") {
      await this.milestones.create({
        projectId,
        title: "Project delivery",
        description: "",
        dueDate: optDate(body, "expectedCompletionDate"),
        status: "draft",
      });
    } else {
      const inline = parseInlineMilestones(body);
      for (const m of inline) {
        await this.milestones.create({
          projectId,
          title: m.title,
          description: sanitizeMilestoneHtml(m.description),
          startDate: m.startDate,
          dueDate: m.dueDate,
          status: "draft",
        });
        await this.activity.log({
          projectId,
          type: "RELEASE_CREATED",
          message: `Milestone "${m.title}" created`,
        });
      }
    }
    await this.recomputeProjectScore(projectId);

    await this.activity.log({
      projectId,
      type: "PROJECT_CREATED",
      message: `Project "${project.name}" created for ${project.clientCompanyName}`,
    });

    return { id: projectId };
  }

  async updateProject(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(projectId, user, canManageProject, "Only a project owner can edit the project.");

    const current = await this.projects.findById(projectId).select("projectType");
    if (current?.projectType === "whole") {
      const sent = await this.milestones.exists({ projectId, status: "sent" });
      if (sent) {
        throw new BadRequestException(
          "This project is locked for editing while its milestone is with the client for review.",
        );
      }
    }

    await this.projects.findByIdAndUpdate(projectId, {
      name: str(body, "name"),
      clientCompanyName: str(body, "clientCompanyName"),
      clientContactName: optStr(body, "clientContactName"),
      clientEmail: str(body, "clientEmail"),
      services: optStr(body, "services"),
      description: optStr(body, "description"),
      startDate: optDate(body, "startDate"),
      expectedCompletionDate: optDate(body, "expectedCompletionDate"),
      actualCompletionDate: optDate(body, "actualCompletionDate"),
      teamSize: optInt(body, "teamSize"),
      engagementModel: optStr(body, "engagementModel"),
      internalRef: optStr(body, "internalRef"),
      projectUrl: optStr(body, "projectUrl"),
      status: str(body, "status"),
    });

    await this.projects.updateOne(
      { _id: projectId, adminStatus: "published" },
      { $set: { adminStatus: "edited" } },
    );

    await this.activity.log({ projectId, type: "PROJECT_UPDATED", message: "Project details updated" });
  }

  /**
   * Replace the delivering-company people assigned to a project. The effective
   * vendor team is recomputed live on every read from these ids, so there is
   * nothing else to sync.
   */
  async setDeliveryStaffing(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    const project = await this.requirePermission(
      projectId,
      user,
      canManageProject,
      "Only a project owner can change project staffing.",
    );
    const deliveringCompanyId =
      project.deliveringCompanyId ??
      (await this.companies.resolveActingCompany(user, optStr(body, "deliveringCompanyId") ?? undefined));
    const assignedMemberIds = await this.ownedMemberIds(deliveringCompanyId, strList(body, "memberIds"));
    await this.projects.findByIdAndUpdate(projectId, { assignedMemberIds });
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: `Project staffing updated — ${assignedMemberIds.length} ${
        assignedMemberIds.length === 1 ? "person" : "people"
      }`,
    });
  }

  // --- Admin approval lifecycle (spec §5.1, §9) ---

  async submitForApproval(user: SessionUser, projectId: string): Promise<void> {
    await this.requirePermission(projectId, user, canManageProject, "Only a project owner can submit for approval.");
    await this.projects.findByIdAndUpdate(projectId, { adminStatus: "pending_approval" });
    await this.activity.log({ projectId, type: "PROJECT_UPDATED", message: "Submitted for admin approval" });
  }

  async approveProject(projectId: string): Promise<void> {
    await this.projects.findByIdAndUpdate(projectId, { adminStatus: "published" });
    await this.activity.log({ projectId, type: "PROJECT_UPDATED", message: "Project shell approved by admin" });
  }

  async rejectProject(projectId: string): Promise<void> {
    await this.projects.findByIdAndUpdate(projectId, { adminStatus: "rejected" });
    await this.activity.log({ projectId, type: "PROJECT_UPDATED", message: "Project shell rejected by admin" });
  }

  async setProjectStatus(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(projectId, user, canManageProject, "Only a project owner can change the project status.");
    const status = str(body, "status");
    await this.projects.findByIdAndUpdate(projectId, { status });
    await this.activity.log({
      projectId,
      type: status === "COMPLETED" ? "PROJECT_COMPLETED" : "PROJECT_UPDATED",
      message: `Project status changed to ${status.replace("_", " ")}`,
    });
  }

  // --- Completion (spec §5.2, §6.8) ---

  async requestCompletion(user: SessionUser, projectId: string): Promise<void> {
    const project = await this.requirePermission(
      projectId,
      user,
      canManageProject,
      "Only a delivering-company owner or admin can request completion.",
    );
    if (project.executionStatus !== "ongoing") {
      throw new BadRequestException("Completion can only be requested while the project is ongoing.");
    }
    const sent = await this.milestones.exists({ projectId, status: "sent" });
    if (sent) {
      throw new BadRequestException(
        "A milestone is still with the client. Wait for that review before requesting completion.",
      );
    }
    await this.projects.findByIdAndUpdate(projectId, {
      executionStatus: "awaiting_completion",
      completionRequestedAt: new Date(),
    });
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: "Vendor requested project completion — awaiting client confirmation",
    });
  }

  async confirmCompletion(user: SessionUser, projectId: string): Promise<void> {
    await this.requirePermission(
      projectId,
      user,
      canConfirmCompletion,
      "Only a receiving-company owner or admin can confirm completion.",
    );
    await this.recomputeProjectScore(projectId);
    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");
    if (doc.executionStatus !== "awaiting_completion") {
      throw new BadRequestException("This project is not awaiting completion confirmation.");
    }
    doc.executionStatus = "completed";
    doc.completionConfirmedByClient = true;
    doc.finalScore = doc.liveScore ?? null;
    await doc.save();
    await this.activity.log({
      projectId,
      type: "PROJECT_COMPLETED",
      message: `Client confirmed completion — final score locked${
        doc.finalScore != null ? ` at ${doc.finalScore.toFixed(1)}` : " (unrated)"
      }`,
    });
  }

  async forceCompleteProject(projectId: string): Promise<void> {
    await this.recomputeProjectScore(projectId);
    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");
    if (doc.executionStatus !== "awaiting_completion") {
      throw new BadRequestException("This project is not awaiting completion.");
    }
    const cutoff = Date.now() - COMPLETION_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;
    if (!doc.completionRequestedAt || doc.completionRequestedAt.getTime() > cutoff) {
      throw new BadRequestException(
        `The client still has time to respond (${COMPLETION_TIMEOUT_DAYS}-day window).`,
      );
    }
    doc.executionStatus = "completed";
    doc.completionForcedByAdmin = true;
    doc.finalScore = doc.liveScore ?? null;
    await doc.save();
    await this.activity.log({
      projectId,
      type: "PROJECT_COMPLETED",
      message: `Admin force-completed after the ${COMPLETION_TIMEOUT_DAYS}-day timeout${
        doc.finalScore != null ? ` — final score ${doc.finalScore.toFixed(1)}` : " (unrated)"
      }`,
    });
  }

  // --- Capstone endorsement (spec §4.5, §6.9) ---

  async requestCapstone(user: SessionUser, projectId: string): Promise<void> {
    await this.requirePermission(
      projectId,
      user,
      canRequestCapstone,
      "Only a delivering-company owner or admin can request a capstone endorsement.",
    );
    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");
    if (doc.executionStatus !== "completed") {
      throw new BadRequestException(
        "A capstone endorsement can only be requested after the project is completed.",
      );
    }
    if (doc.capstone?.requested) {
      throw new BadRequestException("A capstone endorsement has already been requested for this project.");
    }
    doc.capstone = {
      requested: true,
      submitted: false,
      attributes: [],
      testimonial: "",
      anonymous: false,
      tier: tierForScore(doc.finalScore ?? null),
      requestedAt: new Date(),
      submittedAt: null,
    };
    await doc.save();
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: "Vendor requested a capstone endorsement from the client",
    });
  }

  async submitCapstone(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(
      projectId,
      user,
      canSubmitCapstone,
      "Only a receiving-company owner or admin can submit the capstone endorsement.",
    );
    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");
    if (!doc.capstone?.requested) {
      throw new BadRequestException("No capstone endorsement has been requested for this project.");
    }
    if (doc.capstone.submitted) {
      throw new BadRequestException("The capstone endorsement has already been submitted.");
    }
    const pool = new Set(CAPSTONE_ATTRIBUTE_POOL[doc.capstone.tier as CapstoneTier]);
    const attributes = strList(body, "attributes").filter((a) => pool.has(a));
    if (attributes.length === 0) throw new BadRequestException("Pick at least one attribute.");
    if (attributes.length > MAX_CAPSTONE_ATTRIBUTES) {
      throw new BadRequestException(`Pick at most ${MAX_CAPSTONE_ATTRIBUTES} attributes.`);
    }
    const testimonial = str(body, "testimonial");
    if (!testimonial) throw new BadRequestException("A short testimonial is required.");

    doc.capstone.attributes = attributes;
    doc.capstone.testimonial = testimonial;
    doc.capstone.anonymous = bool(body, "anonymous");
    doc.capstone.submitted = true;
    doc.capstone.submittedAt = new Date();
    await doc.save();

    await this.activity.log({
      projectId,
      type: "FEEDBACK_RECEIVED",
      message: "Client submitted a capstone endorsement",
    });
  }

  // --- Publication (PRD §18-21) ---

  async publishProject(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(projectId, user, canManageProject, "Only a project owner can publish the project.");
    const project = await this.projects.findById(projectId).select("adminStatus");
    if (!project) throw new NotFoundException("Project not found.");
    if (project.adminStatus !== "published") {
      throw new BadRequestException(
        "This project needs admin approval before it can be published to the public portfolio.",
      );
    }
    await this.activity.log({
      projectId,
      type: "PUBLICATION_REQUESTED",
      message: "Publication requested by vendor",
    });
    await this.projects.findByIdAndUpdate(projectId, {
      visibility: "PUBLIC",
      publishedAt: new Date(),
      publicSummary: optStr(body, "publicSummary"),
      publicKeyChallenges: optStr(body, "publicKeyChallenges"),
      publicSolution: optStr(body, "publicSolution"),
      publicOutcome: optStr(body, "publicOutcome"),
      publicTechStack: optStr(body, "publicTechStack"),
      publicPlatforms: optStr(body, "publicPlatforms"),
      publicBudget: optStr(body, "publicBudget"),
      publicImageUrl: optStr(body, "publicImageUrl"),
      publicPerformanceConsent: bool(body, "publicPerformanceConsent"),
    });
    await this.activity.log({
      projectId,
      type: "PROJECT_PUBLISHED",
      message: "Project published to public portfolio",
    });
  }

  async unpublishProject(user: SessionUser, projectId: string): Promise<void> {
    await this.requirePermission(projectId, user, canManageProject, "Only a project owner can change publication.");
    await this.projects.findByIdAndUpdate(projectId, { visibility: "PRIVATE", publishedAt: null });
    await this.activity.log({ projectId, type: "PROJECT_UPDATED", message: "Project reverted to private" });
  }

  // -------------------------------------------------------------------------
  // Review-side staffing (company-unification PR2). Mirror of setDeliveryStaffing
  // for the receiving company. Its owner/admin picks which of their people are
  // on the project.
  // -------------------------------------------------------------------------

  async setReviewStaffing(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    const project = await this.requirePermission(
      projectId,
      user,
      canManageReviewStaffing,
      "Only a receiving-company owner or admin can change review staffing.",
    );
    if (!project.receivingCompanyId) throw new BadRequestException("This project has no client company.");
    const receivingMemberIds = await this.ownedMemberIds(
      project.receivingCompanyId,
      strList(body, "memberIds"),
    );
    await this.projects.findByIdAndUpdate(projectId, { receivingMemberIds });
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: `Client staffing updated — ${receivingMemberIds.length} ${
        receivingMemberIds.length === 1 ? "person" : "people"
      }`,
    });
  }
}
