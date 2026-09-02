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
import {
  serializeActivity,
  serializeInvitation,
  serializeMilestone,
  serializeProject,
} from "../common/serialize";
import { runningAverage } from "../common/scoring";
import { minReviewThreshold, COMPLETION_TIMEOUT_DAYS, RATING_SELF_CORRECTION_HOURS } from "../common/constants";
import { CAPSTONE_ATTRIBUTE_POOL, MAX_CAPSTONE_ATTRIBUTES, tierForScore } from "../common/attributes";
import { assertPermission, canManageProject } from "../common/permissions";
import { bool, optDate, optInt, optStr, str, strList } from "../common/input";
import type {
  ActivityWithMilestoneName,
  CapstoneTier,
  Milestone,
  Project,
  ProjectWithMilestones,
  SessionUser,
  VendorTeamMember,
} from "../common/types";

const isValidId = (id: string) => Types.ObjectId.isValid(id);
const toObjectIds = (ids: string[]) =>
  ids.filter(isValidId).map((id) => new Types.ObjectId(id));

/**
 * Merge a project's stored vendorTeam (the founding owner + any grandfathered
 * rows) with the people resolved live from its assigned teams / members. Stored
 * rows win on an email clash so the founding owner keeps their role.
 */
function mergeVendorTeam(
  stored: VendorTeamMember[],
  resolved: VendorTeamMember[],
): VendorTeamMember[] {
  const byEmail = new Map<string, VendorTeamMember>();
  for (const r of resolved) byEmail.set(r.email.toLowerCase(), r);
  for (const s of stored) byEmail.set(s.email.toLowerCase(), s);
  return [...byEmail.values()];
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(MODEL.Project) private readonly projects: Model<any>,
    @InjectModel(MODEL.Milestone) private readonly milestones: Model<any>,
    @InjectModel(MODEL.Activity) private readonly activities: Model<any>,
    @InjectModel(MODEL.Invitation) private readonly invitations: Model<any>,
    @InjectModel(MODEL.Team) private readonly teams: Model<any>,
    @InjectModel(MODEL.VendorMember) private readonly vendorMembers: Model<any>,
    @InjectModel(MODEL.ClientCompany) private readonly clientCompanies: Model<any>,
    private readonly activity: ActivityService,
    private readonly users: UsersService,
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

  /**
   * Resolve every project's assigned teams / members and fold the current
   * membership into `project.vendorTeam` (live reference — Team Management
   * feature). All downstream permission checks and UI keep reading
   * `vendorTeam`, so nothing else has to change.
   */
  private async hydrateVendorTeams<T extends Project>(projects: T[]): Promise<T[]> {
    const teamIds = new Set<string>();
    const memberIds = new Set<string>();
    for (const p of projects) {
      for (const id of p.assignedTeamIds ?? []) teamIds.add(id);
      for (const id of p.assignedMemberIds ?? []) memberIds.add(id);
    }
    if (teamIds.size === 0 && memberIds.size === 0) return projects;

    const teamDocs = teamIds.size
      ? await this.teams
          .find({ _id: { $in: toObjectIds([...teamIds]) } })
          .select({ memberIds: 1 })
          .lean()
      : [];
    const teamMembers = new Map<string, string[]>();
    for (const t of teamDocs) {
      const ids = ((t.memberIds as unknown[]) ?? []).map((m) => String(m));
      teamMembers.set(String(t._id), ids);
      for (const id of ids) memberIds.add(id);
    }

    const memberDocs = memberIds.size
      ? await this.vendorMembers.find({ _id: { $in: toObjectIds([...memberIds]) } }).lean()
      : [];
    const memberById = new Map<string, Record<string, any>>(
      memberDocs.map((m) => [String(m._id), m as Record<string, any>]),
    );

    return projects.map((p) => {
      const wanted = new Set<string>(p.assignedMemberIds ?? []);
      for (const tid of p.assignedTeamIds ?? []) {
        for (const mid of teamMembers.get(tid) ?? []) wanted.add(mid);
      }
      const resolved: VendorTeamMember[] = [];
      for (const mid of wanted) {
        const m = memberById.get(mid);
        if (!m) continue;
        resolved.push({
          userId: m.userId ? String(m.userId) : null,
          email: String(m.email),
          name: m.name ?? null,
          role: m.role === "owner" ? "owner" : "member",
          invitePending: m.userId == null,
        });
      }
      return { ...p, vendorTeam: mergeVendorTeam(p.vendorTeam, resolved) };
    });
  }

  /**
   * The ids of every project a vendor user belongs to — whether as a stored
   * vendorTeam row (founding owner / grandfathered) or via an assigned team or
   * an individual assignment that resolves to a directory member linked to
   * their account. Returns null when there is no vendor scope to apply.
   */
  async projectIdsForVendor(vendorUserId?: string): Promise<Types.ObjectId[] | null> {
    if (!vendorUserId || !isValidId(vendorUserId)) return null;
    const uid = new Types.ObjectId(vendorUserId);

    const myMembers = await this.vendorMembers.find({ userId: uid }).select({ _id: 1 }).lean();
    const myMemberIds = myMembers.map((m) => m._id as Types.ObjectId);
    const myTeams = myMemberIds.length
      ? await this.teams.find({ memberIds: { $in: myMemberIds } }).select({ _id: 1 }).lean()
      : [];
    const myTeamIds = myTeams.map((t) => t._id as Types.ObjectId);

    const or: Record<string, unknown>[] = [{ "vendorTeam.userId": uid }];
    if (myMemberIds.length) or.push({ assignedMemberIds: { $in: myMemberIds } });
    if (myTeamIds.length) or.push({ assignedTeamIds: { $in: myTeamIds } });

    const docs = await this.projects.find({ $or: or }).select({ _id: 1 }).lean();
    return docs.map((d) => d._id as Types.ObjectId);
  }

  // -------------------------------------------------------------------------
  // reads (ported from data.ts)
  // -------------------------------------------------------------------------

  async countProjects(vendorUserId?: string): Promise<number> {
    const ids = await this.projectIdsForVendor(vendorUserId);
    return this.projects.countDocuments(ids ? { _id: { $in: ids } } : {});
  }

  async listProjectsWithMilestones(filter: {
    status?: string;
    q?: string;
    vendorUserId?: string;
  } = {}): Promise<ProjectWithMilestones[]> {
    const clauses: Record<string, unknown>[] = [];
    const ids = await this.projectIdsForVendor(filter.vendorUserId);
    if (ids) clauses.push({ _id: { $in: ids } });
    if (filter.status) clauses.push({ status: filter.status });
    if (filter.q) {
      const rx = new RegExp(filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      clauses.push({ $or: [{ name: rx }, { clientCompanyName: rx }] });
    }
    const query = clauses.length ? { $and: clauses } : {};
    const projectDocs = await this.projects.find(query).sort({ updatedAt: -1 }).lean();
    const projects = projectDocs.map((p) => serializeProject(p as Record<string, unknown>));
    return this.attachMilestones(await this.hydrateVendorTeams(projects));
  }

  async listProjectsForUser(userId: string): Promise<ProjectWithMilestones[]> {
    if (!isValidId(userId)) return [];
    const docs = await this.projects
      .find({ "clientContacts.userId": new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .lean();
    const projects = docs.map((p) => serializeProject(p as Record<string, unknown>));
    return this.attachMilestones(await this.hydrateVendorTeams(projects));
  }

  async getProject(id: string): Promise<Project | null> {
    if (!isValidId(id)) return null;
    const doc = await this.projects.findById(id).lean();
    if (!doc) return null;
    const [hydrated] = await this.hydrateVendorTeams([
      serializeProject(doc as Record<string, unknown>),
    ]);
    return hydrated;
  }

  async getProjectOrThrow(id: string): Promise<Project> {
    const project = await this.getProject(id);
    if (!project) throw new NotFoundException("Project not found.");
    return project;
  }

  async listProjectsForAdmin(filter: { adminStatus?: string } = {}): Promise<Project[]> {
    const query: Record<string, unknown> = {};
    if (filter.adminStatus) query.adminStatus = filter.adminStatus;
    const docs = await this.projects.find(query).sort({ updatedAt: -1 }).lean();
    return this.hydrateVendorTeams(docs.map((p) => serializeProject(p as Record<string, unknown>)));
  }

  async listProjectsAwaitingCompletionTimeout(timeoutDays: number): Promise<Project[]> {
    const cutoff = new Date(Date.now() - timeoutDays * 24 * 60 * 60 * 1000);
    const docs = await this.projects
      .find({ executionStatus: "awaiting_completion", completionRequestedAt: { $lte: cutoff } })
      .sort({ completionRequestedAt: 1 })
      .lean();
    return this.hydrateVendorTeams(docs.map((p) => serializeProject(p as Record<string, unknown>)));
  }

  async getProjectWithMilestones(id: string): Promise<ProjectWithMilestones | null> {
    const project = await this.getProject(id);
    if (!project) return null;
    const [withMilestones] = await this.attachMilestones([project]);
    return withMilestones;
  }

  async getProjectDetail(
    id: string,
  ): Promise<(ProjectWithMilestones & { activities: ActivityWithMilestoneName[] }) | null> {
    const withMilestones = await this.getProjectWithMilestones(id);
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

  /** Load the serialized project and enforce a per-project role check (spec §7). */
  async requirePermission(
    projectId: string,
    user: SessionUser,
    check: (u: SessionUser, p: Project) => boolean,
    message?: string,
  ): Promise<Project> {
    const project = await this.getProjectOrThrow(projectId);
    assertPermission(check(user, project), message);
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
   * Resolve the client company for a new project: an existing directory entry
   * picked by id, or one created inline from `newCompany*` fields. Falls back to
   * the legacy free-text `clientCompanyName` / `clientEmail` body fields so
   * direct API callers and older forms keep working.
   */
  private async resolveClientCompany(
    user: SessionUser,
    body: Record<string, unknown>,
  ): Promise<{
    companyId: string | null;
    name: string;
    contactEmail: string;
    contactName: string | null;
    designation: string;
  }> {
    const pickedId = optStr(body, "clientCompanyId");
    if (pickedId) {
      if (!isValidId(pickedId)) throw new BadRequestException("Invalid client company.");
      const company = (await this.clientCompanies.findById(pickedId).lean()) as Record<
        string,
        any
      > | null;
      if (!company) throw new BadRequestException("The selected client company no longer exists.");
      return {
        companyId: String(company._id),
        name: String(company.name),
        contactEmail: String(company.contactEmail ?? "").toLowerCase(),
        contactName: (company.contactName as string | null) ?? null,
        designation: (company.designation as string) || "Client Contact",
      };
    }

    const newName = optStr(body, "newCompanyName");
    if (newName) {
      const created = await this.clientCompanies.create({
        name: newName,
        contactName: optStr(body, "newCompanyContactName"),
        contactEmail: str(body, "newCompanyContactEmail").toLowerCase(),
        designation: optStr(body, "newCompanyDesignation") ?? "",
        createdByUserId: user.id,
      });
      return {
        companyId: String(created._id),
        name: created.name,
        contactEmail: String(created.contactEmail ?? "").toLowerCase(),
        contactName: created.contactName ?? null,
        designation: (created.designation as string) || "Client Contact",
      };
    }

    return {
      companyId: null,
      name: str(body, "clientCompanyName"),
      contactEmail: str(body, "clientEmail").toLowerCase(),
      contactName: optStr(body, "clientContactName"),
      designation: optStr(body, "contactDesignation") ?? "Client Contact",
    };
  }

  /** Keep only assignment ids that are real directory entities owned by this vendor. */
  private async ownedAssignments(
    ownerUserId: string,
    teamIds: string[],
    memberIds: string[],
  ): Promise<{ teamIds: Types.ObjectId[]; memberIds: Types.ObjectId[] }> {
    const owner = new Types.ObjectId(ownerUserId);
    const teamOids = toObjectIds(teamIds);
    const memberOids = toObjectIds(memberIds);
    const [teams, members] = await Promise.all([
      teamOids.length
        ? this.teams.find({ _id: { $in: teamOids }, ownerUserId: owner }).select({ _id: 1 }).lean()
        : [],
      memberOids.length
        ? this.vendorMembers
            .find({ _id: { $in: memberOids }, ownerUserId: owner })
            .select({ _id: 1 })
            .lean()
        : [],
    ]);
    return {
      teamIds: teams.map((t) => t._id as Types.ObjectId),
      memberIds: members.map((m) => m._id as Types.ObjectId),
    };
  }

  async createProject(user: SessionUser, body: Record<string, unknown>): Promise<{ id: string }> {
    if (user.role !== "vendor") throw new ForbiddenException("Only vendors can create projects.");

    const company = await this.resolveClientCompany(user, body);
    if (!company.name) throw new BadRequestException("Select or add a client company.");
    if (!company.contactEmail) {
      throw new BadRequestException("The client company needs a contact email.");
    }

    const assignments = await this.ownedAssignments(
      user.id,
      strList(body, "teamIds"),
      strList(body, "memberIds"),
    );

    const project = await this.projects.create({
      name: str(body, "name"),
      clientCompanyName: company.name,
      clientCompanyId: company.companyId,
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
      assignedTeamIds: assignments.teamIds,
      assignedMemberIds: assignments.memberIds,
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
        targetDate: optDate(body, "expectedCompletionDate"),
        status: "draft",
      });
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
   * Replace a project's assigned teams / individual members (Team Management
   * feature). The effective vendor team is recomputed live on every read from
   * these ids, so there is nothing else to sync.
   */
  async setAssignedTeams(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(
      projectId,
      user,
      canManageProject,
      "Only a project owner can change project staffing.",
    );
    const assignments = await this.ownedAssignments(
      user.id,
      strList(body, "teamIds"),
      strList(body, "memberIds"),
    );
    await this.projects.findByIdAndUpdate(projectId, {
      assignedTeamIds: assignments.teamIds,
      assignedMemberIds: assignments.memberIds,
    });
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: `Project staffing updated — ${assignments.teamIds.length} team(s), ${assignments.memberIds.length} individual(s)`,
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
      (u, p) => this.isVendorOwner(u, p),
      "Only a project owner can request completion.",
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
      (u, p) => this.isPrimaryContact(u, p),
      "Only the primary client contact can confirm completion.",
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
      (u, p) => this.isVendorOwner(u, p),
      "Only a project owner can request a capstone endorsement.",
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
      (u, p) => this.isPrimaryContact(u, p),
      "Only the primary client contact can submit the capstone endorsement.",
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
  // People & invitations (spec §4.3, §4.4, §7, §8)
  // -------------------------------------------------------------------------

  private isVendorOwner(u: SessionUser, p: Project): boolean {
    return !!p.vendorTeam.find((v) => !v.invitePending && v.userId === u.id && v.role === "owner");
  }
  private isPrimaryContact(u: SessionUser, p: Project): boolean {
    return !!p.clientContacts.find((c) => !c.invitePending && c.userId === u.id && c.role === "primary");
  }

  async inviteVendorTeamMember(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(projectId, user, canManageProject, "Only a project owner can invite teammates.");
    const email = (optStr(body, "email") ?? "").toLowerCase();
    if (!email) throw new BadRequestException("An email address is required.");
    const role = str(body, "role") === "owner" ? "owner" : "member";

    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");
    if (doc.vendorTeam.some((v: any) => v.email === email)) {
      throw new BadRequestException("That person is already on the vendor team.");
    }
    await this.invitations.create({
      email,
      projectId,
      kind: "vendor_team",
      proposedRole: role,
      invitedByUserId: user.id,
    });
    doc.vendorTeam.push({ userId: null, email, name: null, role, invitePending: true });
    await doc.save();
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: `Invited ${email} to the vendor team as ${role}`,
    });
  }

  async removeVendorTeamMember(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(projectId, user, canManageProject, "Only a project owner can remove teammates.");
    const email = (optStr(body, "email") ?? "").toLowerCase();
    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");

    const target = doc.vendorTeam.find((v: any) => v.email === email);
    if (!target) throw new BadRequestException("That person is not on the vendor team.");

    const activeOwners = doc.vendorTeam.filter((v: any) => v.role === "owner" && !v.invitePending);
    if (target.role === "owner" && !target.invitePending && activeOwners.length <= 1) {
      throw new BadRequestException("A project must always keep at least one vendor owner.");
    }
    doc.vendorTeam = doc.vendorTeam.filter((v: any) => v.email !== email);
    await doc.save();
    await this.invitations.updateMany(
      { projectId, email, kind: "vendor_team", status: "pending" },
      { $set: { status: "revoked" } },
    );
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: `Removed ${email} from the vendor team`,
    });
  }

  async inviteClientContact(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(projectId, user, canManageProject, "Only a project owner can invite the client contact.");
    const email = (optStr(body, "email") ?? "").toLowerCase();
    if (!email) throw new BadRequestException("An email address is required.");
    const designation = optStr(body, "designation") ?? "Client Contact";

    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");

    for (const c of doc.clientContacts) {
      if (c.role === "primary" && !c.invitePending && c.email !== email) c.role = "collaborator";
    }
    doc.clientContacts = doc.clientContacts.filter(
      (c: any) => !(c.role === "primary" && c.invitePending && c.email !== email),
    );
    await this.invitations.updateMany(
      {
        projectId,
        kind: "client_contact",
        proposedRole: "primary",
        status: "pending",
        email: { $ne: email },
      },
      { $set: { status: "revoked" } },
    );

    const existing = doc.clientContacts.find((c: any) => c.email === email);
    if (existing) {
      existing.role = "primary";
      existing.designation = designation;
      if (!existing.userId) existing.invitePending = true;
    } else {
      doc.clientContacts.push({
        userId: null,
        email,
        name: null,
        designation,
        role: "primary",
        invitePending: true,
      });
    }
    await doc.save();

    if (!existing?.userId) {
      await this.invitations.create({
        email,
        projectId,
        kind: "client_contact",
        proposedRole: "primary",
        designation,
        invitedByUserId: user.id,
      });
    }
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: `Invited ${email} as the primary client contact`,
    });
  }

  async reassignPrimaryContact(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(projectId, user, canManageProject, "Only a project owner can reassign the primary contact.");
    const email = (optStr(body, "email") ?? "").toLowerCase();
    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");

    const target = doc.clientContacts.find((c: any) => c.email === email && !c.invitePending);
    if (!target) throw new BadRequestException("That person is not an active client contact on this project.");

    for (const c of doc.clientContacts) {
      if (c.role === "primary" && !c.invitePending) c.role = "collaborator";
    }
    target.role = "primary";
    await doc.save();
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: `${email} is now the primary client contact`,
    });
  }

  async inviteCollaborator(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    await this.requirePermission(
      projectId,
      user,
      (u, p) => this.isPrimaryContact(u, p),
      "Only the primary contact can invite collaborators.",
    );
    const email = (optStr(body, "email") ?? "").toLowerCase();
    if (!email) throw new BadRequestException("An email address is required.");

    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");
    if (doc.clientContacts.some((c: any) => c.email === email)) {
      throw new BadRequestException("That person is already a client contact.");
    }
    await this.invitations.create({
      email,
      projectId,
      kind: "client_contact",
      proposedRole: "collaborator",
      invitedByUserId: user.id,
    });
    doc.clientContacts.push({
      userId: null,
      email,
      name: null,
      designation: "Collaborator",
      role: "collaborator",
      invitePending: true,
    });
    await doc.save();
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: `Invited ${email} as a collaborator`,
    });
  }

  async removeClientContact(user: SessionUser, projectId: string, body: Record<string, unknown>): Promise<void> {
    const project = await this.getProjectOrThrow(projectId);
    const isOwner = this.isVendorOwner(user, project);
    const isPrimary = this.isPrimaryContact(user, project);
    if (!isOwner && !isPrimary) {
      throw new ForbiddenException("You cannot manage this project's client contacts.");
    }

    const email = (optStr(body, "email") ?? "").toLowerCase();
    const doc = await this.projects.findById(projectId);
    if (!doc) throw new NotFoundException("Project not found.");

    const target = doc.clientContacts.find((c: any) => c.email === email);
    if (!target) throw new BadRequestException("That person is not a client contact on this project.");

    if (!isOwner && target.role !== "collaborator") {
      throw new ForbiddenException("The primary contact can only remove collaborators.");
    }
    if (target.role === "primary" && !target.invitePending) {
      throw new BadRequestException("Reassign the primary contact before removing them.");
    }
    doc.clientContacts = doc.clientContacts.filter((c: any) => c.email !== email);
    await doc.save();
    await this.invitations.updateMany(
      { projectId, email, kind: "client_contact", status: "pending" },
      { $set: { status: "revoked" } },
    );
    await this.activity.log({
      projectId,
      type: "PROJECT_UPDATED",
      message: `Removed client contact ${email}`,
    });
  }
}
