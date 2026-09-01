import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose";
import { ActivityModel, FeedbackRequestModel, ProjectModel, ReleaseModel } from "./models";
import type {
  Activity,
  ActivityWithReleaseName,
  FeedbackRequest,
  FeedbackRequestWithContext,
  Project,
  ProjectWithReleases,
  RecentActivity,
  Release,
  ReleaseWithFeedback,
  ReleaseWithFullProject,
  ReleaseWithProject,
} from "./types";

// ---------------------------------------------------------------------------
// serialization — lean Mongoose docs -> the plain shapes in types.ts
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number | null => (v == null ? null : Number(v));
const date = (v: unknown): Date | null => (v == null ? null : (v as Date));

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

function serializeRelease(r: Raw): Release {
  return {
    id: String(r._id),
    projectId: String(r.projectId),
    name: r.name as string,
    versionLabel: str(r.versionLabel),
    description: str(r.description),
    objectives: str(r.objectives),
    deliverables: str(r.deliverables),
    plannedDeliveryDate: date(r.plannedDeliveryDate),
    actualDeliveryDate: date(r.actualDeliveryDate),
    startDate: date(r.startDate),
    status: (r.status as Release["status"]) ?? "DRAFT",
    demoUrl: str(r.demoUrl),
    internalNotes: str(r.internalNotes),
    clientFacingNotes: str(r.clientFacingNotes),
    teamSize: num(r.teamSize),
    createdAt: date(r.createdAt) ?? new Date(0),
    updatedAt: date(r.updatedAt) ?? new Date(0),
  };
}

function serializeFeedbackRequest(f: Raw): FeedbackRequest {
  return {
    id: String(f._id),
    releaseId: String(f.releaseId),
    clientEmail: f.clientEmail as string,
    token: f.token as string,
    status: (f.status as FeedbackRequest["status"]) ?? "PENDING",
    sentAt: date(f.sentAt) ?? new Date(0),
    remindersSent: Number(f.remindersSent ?? 0),
    completedAt: date(f.completedAt),
    overallSatisfaction: num(f.overallSatisfaction),
    qualityOfDeliverables: num(f.qualityOfDeliverables),
    timeliness: num(f.timeliness),
    communication: num(f.communication),
    understandingOfRequirements: num(f.understandingOfRequirements),
    deliveryAgainstScope: num(f.deliveryAgainstScope),
    wouldContinue: num(f.wouldContinue),
    comments: str(f.comments),
    reviewerEmail: str(f.reviewerEmail),
    verified: f.verified == null ? true : Boolean(f.verified),
    flagged: Boolean(f.flagged),
  };
}

function serializeActivity(a: Raw): Activity {
  return {
    id: String(a._id),
    projectId: String(a.projectId),
    releaseId: a.releaseId == null ? null : String(a.releaseId),
    type: a.type as Activity["type"],
    message: a.message as string,
    createdAt: date(a.createdAt) ?? new Date(0),
  };
}

const isValidId = (id: string) => mongoose.isValidObjectId(id);

// ---------------------------------------------------------------------------
// assembly helpers
// ---------------------------------------------------------------------------

async function attachReleases(projects: Project[]): Promise<ProjectWithReleases[]> {
  const projectIds = projects.map((p) => p.id);
  const releaseDocs = await ReleaseModel.find({ projectId: { $in: projectIds } })
    .sort({ createdAt: 1 })
    .lean();
  const releases = releaseDocs.map((r) => serializeRelease(r as unknown as Raw));

  const feedbackDocs = await FeedbackRequestModel.find({
    releaseId: { $in: releases.map((r) => r.id) },
  }).lean();
  const feedbackByRelease = new Map(
    feedbackDocs.map((f) => {
      const fr = serializeFeedbackRequest(f as unknown as Raw);
      return [fr.releaseId, fr] as const;
    }),
  );

  const releasesByProject = new Map<string, ReleaseWithFeedback[]>();
  for (const release of releases) {
    const withFeedback: ReleaseWithFeedback = {
      ...release,
      feedbackRequest: feedbackByRelease.get(release.id) ?? null,
    };
    const list = releasesByProject.get(release.projectId) ?? [];
    list.push(withFeedback);
    releasesByProject.set(release.projectId, list);
  }

  return projects.map((p) => ({ ...p, releases: releasesByProject.get(p.id) ?? [] }));
}

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

export async function countProjects(): Promise<number> {
  await connectToDatabase();
  return ProjectModel.countDocuments();
}

export async function listProjectsWithReleases(filter: {
  status?: string;
  q?: string;
} = {}): Promise<ProjectWithReleases[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.q) {
    const rx = new RegExp(filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: rx }, { clientCompanyName: rx }];
  }

  const projectDocs = await ProjectModel.find(query).sort({ updatedAt: -1 }).lean();
  const projects = projectDocs.map((p) => serializeProject(p as unknown as Raw));
  return attachReleases(projects);
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isValidId(id)) return null;
  await connectToDatabase();
  const doc = await ProjectModel.findById(id).lean();
  return doc ? serializeProject(doc as unknown as Raw) : null;
}

export async function getProjectWithReleases(id: string): Promise<ProjectWithReleases | null> {
  const project = await getProject(id);
  if (!project) return null;
  const [withReleases] = await attachReleases([project]);
  return withReleases;
}

export async function getProjectDetail(
  id: string,
): Promise<(ProjectWithReleases & { activities: ActivityWithReleaseName[] }) | null> {
  const withReleases = await getProjectWithReleases(id);
  if (!withReleases) return null;

  const activityDocs = await ActivityModel.find({ projectId: id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const activities = activityDocs.map((a) => serializeActivity(a as unknown as Raw));

  const releaseNameById = new Map(withReleases.releases.map((r) => [r.id, r.name] as const));
  const activitiesWithRelease: ActivityWithReleaseName[] = activities.map((a) => ({
    ...a,
    release: a.releaseId && releaseNameById.has(a.releaseId) ? { name: releaseNameById.get(a.releaseId)! } : null,
  }));

  return { ...withReleases, activities: activitiesWithRelease };
}

// ---------------------------------------------------------------------------
// releases
// ---------------------------------------------------------------------------

export async function countReleases(): Promise<number> {
  await connectToDatabase();
  return ReleaseModel.countDocuments();
}

export async function listReleasesWithProject(
  filter: { status?: string } = {},
): Promise<ReleaseWithProject[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;

  const releaseDocs = await ReleaseModel.find(query).sort({ updatedAt: -1 }).lean();
  const releases = releaseDocs.map((r) => serializeRelease(r as unknown as Raw));

  const feedbackDocs = await FeedbackRequestModel.find({
    releaseId: { $in: releases.map((r) => r.id) },
  }).lean();
  const feedbackByRelease = new Map(
    feedbackDocs.map((f) => {
      const fr = serializeFeedbackRequest(f as unknown as Raw);
      return [fr.releaseId, fr] as const;
    }),
  );

  const projectDocs = await ProjectModel.find({
    _id: { $in: releases.map((r) => r.projectId) },
  }).lean();
  const projectById = new Map(
    projectDocs.map((p) => {
      const project = serializeProject(p as unknown as Raw);
      return [project.id, project] as const;
    }),
  );

  return releases
    .filter((r) => projectById.has(r.projectId))
    .map((r) => {
      const project = projectById.get(r.projectId)!;
      return {
        ...r,
        feedbackRequest: feedbackByRelease.get(r.id) ?? null,
        project: {
          id: project.id,
          name: project.name,
          clientCompanyName: project.clientCompanyName,
        },
      };
    });
}

export async function getRelease(id: string): Promise<Release | null> {
  if (!isValidId(id)) return null;
  await connectToDatabase();
  const doc = await ReleaseModel.findById(id).lean();
  return doc ? serializeRelease(doc as unknown as Raw) : null;
}

export async function getReleaseDetail(id: string): Promise<ReleaseWithFullProject | null> {
  if (!isValidId(id)) return null;
  await connectToDatabase();

  const releaseDoc = await ReleaseModel.findById(id).lean();
  if (!releaseDoc) return null;
  const release = serializeRelease(releaseDoc as unknown as Raw);

  const projectDoc = await ProjectModel.findById(release.projectId).lean();
  if (!projectDoc) return null;

  const feedbackDoc = await FeedbackRequestModel.findOne({ releaseId: release.id }).lean();

  return {
    ...release,
    feedbackRequest: feedbackDoc ? serializeFeedbackRequest(feedbackDoc as unknown as Raw) : null,
    project: serializeProject(projectDoc as unknown as Raw),
  };
}

// ---------------------------------------------------------------------------
// feedback requests
// ---------------------------------------------------------------------------

export async function getFeedbackByToken(token: string): Promise<FeedbackRequestWithContext | null> {
  await connectToDatabase();

  const feedbackDoc = await FeedbackRequestModel.findOne({ token }).lean();
  if (!feedbackDoc) return null;
  const feedback = serializeFeedbackRequest(feedbackDoc as unknown as Raw);

  const releaseDoc = await ReleaseModel.findById(feedback.releaseId).lean();
  if (!releaseDoc) return null;
  const release = serializeRelease(releaseDoc as unknown as Raw);

  const projectDoc = await ProjectModel.findById(release.projectId).lean();
  if (!projectDoc) return null;

  return {
    ...feedback,
    release: { ...release, project: serializeProject(projectDoc as unknown as Raw) },
  };
}

// ---------------------------------------------------------------------------
// activity
// ---------------------------------------------------------------------------

export async function recentActivities(limit: number): Promise<RecentActivity[]> {
  await connectToDatabase();

  const activityDocs = await ActivityModel.find().sort({ createdAt: -1 }).limit(limit).lean();
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
