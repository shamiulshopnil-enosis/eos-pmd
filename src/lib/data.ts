import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose";
import { ActivityModel, InvitationModel, MilestoneModel, ProjectModel } from "./models";
import type {
  Activity,
  ActivityWithMilestoneName,
  ClientContact,
  Invitation,
  Milestone,
  MilestoneWithFullProject,
  MilestoneWithProject,
  Project,
  ProjectWithMilestones,
  RecentActivity,
  VendorTeamMember,
} from "./types";

// ---------------------------------------------------------------------------
// serialization — lean Mongoose docs -> the plain shapes in types.ts
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number | null => (v == null ? null : Number(v));
const date = (v: unknown): Date | null => (v == null ? null : (v as Date));

function serializeVendorMember(v: Raw): VendorTeamMember {
  return {
    userId: v.userId == null ? null : String(v.userId),
    email: String(v.email ?? ""),
    name: str(v.name),
    role: (v.role as VendorTeamMember["role"]) ?? "member",
    invitePending: Boolean(v.invitePending),
  };
}

function serializeClientContact(c: Raw): ClientContact {
  return {
    userId: c.userId == null ? null : String(c.userId),
    email: String(c.email ?? ""),
    name: str(c.name),
    designation: (c.designation as string) ?? "",
    role: (c.role as ClientContact["role"]) ?? "collaborator",
    invitePending: Boolean(c.invitePending),
  };
}

function serializeInvitation(i: Raw): Invitation {
  return {
    id: String(i._id),
    email: String(i.email ?? ""),
    projectId: String(i.projectId),
    kind: i.kind as Invitation["kind"],
    proposedRole: i.proposedRole as Invitation["proposedRole"],
    designation: str(i.designation),
    invitedByUserId: i.invitedByUserId == null ? null : String(i.invitedByUserId),
    status: (i.status as Invitation["status"]) ?? "pending",
    createdAt: date(i.createdAt) ?? new Date(0),
  };
}

function serializeProject(p: Raw): Project {
  return {
    id: String(p._id),
    name: p.name as string,
    clientCompanyName: p.clientCompanyName as string,
    clientContactName: str(p.clientContactName),
    clientEmail: p.clientEmail as string,
    services: str(p.services),
    description: str(p.description),
    startDate: date(p.startDate),
    expectedCompletionDate: date(p.expectedCompletionDate),
    actualCompletionDate: date(p.actualCompletionDate),
    status: (p.status as Project["status"]) ?? "ACTIVE",
    teamSize: num(p.teamSize),
    engagementModel: str(p.engagementModel),
    internalRef: str(p.internalRef),
    projectUrl: str(p.projectUrl),
    visibility: (p.visibility as Project["visibility"]) ?? "PRIVATE",
    projectType: (p.projectType as Project["projectType"]) ?? "whole",
    adminStatus: (p.adminStatus as Project["adminStatus"]) ?? "draft",
    executionStatus: (p.executionStatus as Project["executionStatus"]) ?? "ongoing",
    minReviewThreshold: Number(p.minReviewThreshold ?? 0),
    completionRequestedAt: date(p.completionRequestedAt),
    completionConfirmedByClient: Boolean(p.completionConfirmedByClient),
    completionForcedByAdmin: Boolean(p.completionForcedByAdmin),
    liveScore: num(p.liveScore),
    reviewedMilestoneCount: Number(p.reviewedMilestoneCount ?? 0),
    finalScore: num(p.finalScore),
    vendorTeam: Array.isArray(p.vendorTeam) ? (p.vendorTeam as Raw[]).map(serializeVendorMember) : [],
    clientContacts: Array.isArray(p.clientContacts)
      ? (p.clientContacts as Raw[]).map(serializeClientContact)
      : [],
    publicSummary: str(p.publicSummary),
    publicKeyChallenges: str(p.publicKeyChallenges),
    publicSolution: str(p.publicSolution),
    publicOutcome: str(p.publicOutcome),
    publicTechStack: str(p.publicTechStack),
    publicPlatforms: str(p.publicPlatforms),
    publicBudget: str(p.publicBudget),
    publicImageUrl: str(p.publicImageUrl),
    publicPerformanceConsent: Boolean(p.publicPerformanceConsent),
    publishedAt: date(p.publishedAt),
    createdAt: date(p.createdAt) ?? new Date(0),
    updatedAt: date(p.updatedAt) ?? new Date(0),
  };
}

function serializeMilestone(m: Raw): Milestone {
  return {
    id: String(m._id),
    projectId: String(m.projectId),
    title: m.title as string,
    description: (m.description as string) ?? "",
    targetDate: date(m.targetDate),
    status: (m.status as Milestone["status"]) ?? "draft",
    rating: num(m.rating),
    comment: str(m.comment),
    editRequestedByVendor: Boolean(m.editRequestedByVendor),
    ratingSubmittedAt: date(m.ratingSubmittedAt),
    reviewedAt: date(m.reviewedAt),
    sentAt: date(m.sentAt),
    createdAt: date(m.createdAt) ?? new Date(0),
    updatedAt: date(m.updatedAt) ?? new Date(0),
  };
}

function serializeActivity(a: Raw): Activity {
  return {
    id: String(a._id),
    projectId: String(a.projectId),
    milestoneId: a.milestoneId == null ? null : String(a.milestoneId),
    type: a.type as Activity["type"],
    message: a.message as string,
    createdAt: date(a.createdAt) ?? new Date(0),
  };
}

const isValidId = (id: string) => mongoose.isValidObjectId(id);

// ---------------------------------------------------------------------------
// assembly helpers
// ---------------------------------------------------------------------------

async function attachMilestones(projects: Project[]): Promise<ProjectWithMilestones[]> {
  const projectIds = projects.map((p) => p.id);
  const milestoneDocs = await MilestoneModel.find({ projectId: { $in: projectIds } })
    .sort({ createdAt: 1 })
    .lean();
  const milestones = milestoneDocs.map((m) => serializeMilestone(m as unknown as Raw));

  const byProject = new Map<string, Milestone[]>();
  for (const milestone of milestones) {
    const list = byProject.get(milestone.projectId) ?? [];
    list.push(milestone);
    byProject.set(milestone.projectId, list);
  }

  return projects.map((p) => ({ ...p, milestones: byProject.get(p.id) ?? [] }));
}

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

/** Scope a project query to the vendor team member, when a user id is given. */
function withVendorScope(query: Record<string, unknown>, vendorUserId?: string): Record<string, unknown> {
  if (vendorUserId && isValidId(vendorUserId)) {
    query["vendorTeam.userId"] = new mongoose.Types.ObjectId(vendorUserId);
  }
  return query;
}

export async function countProjects(vendorUserId?: string): Promise<number> {
  await connectToDatabase();
  return ProjectModel.countDocuments(withVendorScope({}, vendorUserId));
}

export async function listProjectsWithMilestones(filter: {
  status?: string;
  q?: string;
  vendorUserId?: string;
} = {}): Promise<ProjectWithMilestones[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = withVendorScope({}, filter.vendorUserId);
  if (filter.status) query.status = filter.status;
  if (filter.q) {
    const rx = new RegExp(filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: rx }, { clientCompanyName: rx }];
  }

  const projectDocs = await ProjectModel.find(query).sort({ updatedAt: -1 }).lean();
  const projects = projectDocs.map((p) => serializeProject(p as unknown as Raw));
  return attachMilestones(projects);
}

/** Projects where the given user is an accepted client contact (buyer "My Projects"). */
export async function listProjectsForUser(userId: string): Promise<ProjectWithMilestones[]> {
  if (!isValidId(userId)) return [];
  await connectToDatabase();
  const docs = await ProjectModel.find({ "clientContacts.userId": new mongoose.Types.ObjectId(userId) })
    .sort({ updatedAt: -1 })
    .lean();
  const projects = docs.map((p) => serializeProject(p as unknown as Raw));
  return attachMilestones(projects);
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isValidId(id)) return null;
  await connectToDatabase();
  const doc = await ProjectModel.findById(id).lean();
  return doc ? serializeProject(doc as unknown as Raw) : null;
}

/** All projects for the admin area, newest activity first. Optionally filter by admin status. */
export async function listProjectsForAdmin(
  filter: { adminStatus?: string } = {},
): Promise<Project[]> {
  await connectToDatabase();
  const query: Record<string, unknown> = {};
  if (filter.adminStatus) query.adminStatus = filter.adminStatus;
  const docs = await ProjectModel.find(query).sort({ updatedAt: -1 }).lean();
  return docs.map((p) => serializeProject(p as unknown as Raw));
}

/** Projects stuck in `awaiting_completion` past the client-response window (spec §6.8 step 3). */
export async function listProjectsAwaitingCompletionTimeout(timeoutDays: number): Promise<Project[]> {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - timeoutDays * 24 * 60 * 60 * 1000);
  const docs = await ProjectModel.find({
    executionStatus: "awaiting_completion",
    completionRequestedAt: { $lte: cutoff },
  })
    .sort({ completionRequestedAt: 1 })
    .lean();
  return docs.map((p) => serializeProject(p as unknown as Raw));
}

export async function getProjectWithMilestones(id: string): Promise<ProjectWithMilestones | null> {
  const project = await getProject(id);
  if (!project) return null;
  const [withMilestones] = await attachMilestones([project]);
  return withMilestones;
}

export async function getProjectDetail(
  id: string,
): Promise<(ProjectWithMilestones & { activities: ActivityWithMilestoneName[] }) | null> {
  const withMilestones = await getProjectWithMilestones(id);
  if (!withMilestones) return null;

  const activityDocs = await ActivityModel.find({ projectId: id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const activities = activityDocs.map((a) => serializeActivity(a as unknown as Raw));

  const titleById = new Map(withMilestones.milestones.map((m) => [m.id, m.title] as const));
  const activitiesWithMilestone: ActivityWithMilestoneName[] = activities.map((a) => ({
    ...a,
    milestone:
      a.milestoneId && titleById.has(a.milestoneId) ? { title: titleById.get(a.milestoneId)! } : null,
  }));

  return { ...withMilestones, activities: activitiesWithMilestone };
}

// ---------------------------------------------------------------------------
// milestones
// ---------------------------------------------------------------------------

async function projectIdsForVendor(vendorUserId?: string): Promise<mongoose.Types.ObjectId[] | null> {
  if (!vendorUserId || !isValidId(vendorUserId)) return null;
  const docs = await ProjectModel.find({
    "vendorTeam.userId": new mongoose.Types.ObjectId(vendorUserId),
  })
    .select({ _id: 1 })
    .lean();
  return docs.map((d) => d._id as mongoose.Types.ObjectId);
}

export async function countMilestones(vendorUserId?: string): Promise<number> {
  await connectToDatabase();
  const ids = await projectIdsForVendor(vendorUserId);
  return MilestoneModel.countDocuments(ids ? { projectId: { $in: ids } } : {});
}

export async function listMilestonesWithProject(
  filter: { status?: string; vendorUserId?: string } = {},
): Promise<MilestoneWithProject[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  const ids = await projectIdsForVendor(filter.vendorUserId);
  if (ids) query.projectId = { $in: ids };

  const milestoneDocs = await MilestoneModel.find(query).sort({ updatedAt: -1 }).lean();
  const milestones = milestoneDocs.map((m) => serializeMilestone(m as unknown as Raw));

  const projectDocs = await ProjectModel.find({
    _id: { $in: milestones.map((m) => m.projectId) },
  }).lean();
  const projectById = new Map(
    projectDocs.map((p) => {
      const project = serializeProject(p as unknown as Raw);
      return [project.id, project] as const;
    }),
  );

  return milestones
    .filter((m) => projectById.has(m.projectId))
    .map((m) => {
      const project = projectById.get(m.projectId)!;
      return {
        ...m,
        project: {
          id: project.id,
          name: project.name,
          clientCompanyName: project.clientCompanyName,
        },
      };
    });
}

export async function getMilestone(id: string): Promise<Milestone | null> {
  if (!isValidId(id)) return null;
  await connectToDatabase();
  const doc = await MilestoneModel.findById(id).lean();
  return doc ? serializeMilestone(doc as unknown as Raw) : null;
}

export async function getMilestoneDetail(id: string): Promise<MilestoneWithFullProject | null> {
  if (!isValidId(id)) return null;
  await connectToDatabase();

  const milestoneDoc = await MilestoneModel.findById(id).lean();
  if (!milestoneDoc) return null;
  const milestone = serializeMilestone(milestoneDoc as unknown as Raw);

  const projectDoc = await ProjectModel.findById(milestone.projectId).lean();
  if (!projectDoc) return null;

  return { ...milestone, project: serializeProject(projectDoc as unknown as Raw) };
}

// ---------------------------------------------------------------------------
// invitations
// ---------------------------------------------------------------------------

export async function getInvitation(id: string): Promise<Invitation | null> {
  if (!isValidId(id)) return null;
  await connectToDatabase();
  const doc = await InvitationModel.findById(id).lean();
  return doc ? serializeInvitation(doc as unknown as Raw) : null;
}

export async function listPendingInvitations(projectId: string): Promise<Invitation[]> {
  if (!isValidId(projectId)) return [];
  await connectToDatabase();
  const docs = await InvitationModel.find({ projectId, status: "pending" }).sort({ createdAt: -1 }).lean();
  return docs.map((d) => serializeInvitation(d as unknown as Raw));
}

// ---------------------------------------------------------------------------
// activity
// ---------------------------------------------------------------------------

export async function recentActivities(limit: number, vendorUserId?: string): Promise<RecentActivity[]> {
  await connectToDatabase();

  const ids = await projectIdsForVendor(vendorUserId);
  const query = ids ? { projectId: { $in: ids } } : {};

  const activityDocs = await ActivityModel.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  const activities = activityDocs.map((a) => serializeActivity(a as unknown as Raw));

  const projectDocs = await ProjectModel.find({
    _id: { $in: activities.map((a) => a.projectId) },
  })
    .select({ name: 1 })
    .lean();
  const projectById = new Map(projectDocs.map((p) => [String(p._id), p.name as string] as const));

  return activities
    .filter((a) => projectById.has(a.projectId))
    .map((a) => ({ ...a, project: { id: a.projectId, name: projectById.get(a.projectId)! } }));
}
