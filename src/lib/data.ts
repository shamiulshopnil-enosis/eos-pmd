import { apiFetch } from "./api-client";
import type {
  ActivityWithMilestoneName,
  Invitation,
  Milestone,
  MilestoneWithFullProject,
  MilestoneWithProject,
  Company,
  CompanySummary,
  CompanyMember,
  Project,
  ProjectWithMilestones,
  RecentActivity,
} from "./types";

// Read layer. Previously these talked to MongoDB through Mongoose; they now call
// the NestJS API (see ../../api and ./api-client). Signatures are unchanged so
// the pages that import them did not need to change.

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

/** Count of projects the signed-in user is on the delivery side of. */
export async function countProjects(): Promise<number> {
  const { count } = await apiFetch<{ count: number }>(`/projects/count`);
  return count;
}

/** Projects the signed-in user can act on. `side` defaults to "delivery". */
export async function listProjectsWithMilestones(
  filter: { status?: string; q?: string; side?: "delivery" | "review" | "any" } = {},
): Promise<ProjectWithMilestones[]> {
  return apiFetch<ProjectWithMilestones[]>(
    `/projects${qs({ status: filter.status, q: filter.q, side: filter.side })}`,
  );
}

/** Projects the signed-in user reviews (their company is the receiving side). */
export async function listReviewProjects(): Promise<ProjectWithMilestones[]> {
  return apiFetch<ProjectWithMilestones[]>(`/projects/mine`);
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    return await apiFetch<Project>(`/projects/${id}`);
  } catch {
    return null;
  }
}

/** All projects for the admin area, newest activity first. Optionally filter by admin status. */
export async function listProjectsForAdmin(
  filter: { adminStatus?: string } = {},
): Promise<Project[]> {
  return apiFetch<Project[]>(`/projects/admin${qs({ adminStatus: filter.adminStatus })}`);
}

/** Projects stuck in `awaiting_completion` past the client-response window (spec §6.8 step 3). */
export async function listProjectsAwaitingCompletionTimeout(timeoutDays: number): Promise<Project[]> {
  return apiFetch<Project[]>(
    `/projects/awaiting-completion-timeout${qs({ days: timeoutDays })}`,
  );
}

export async function getProjectWithMilestones(id: string): Promise<ProjectWithMilestones | null> {
  try {
    return await apiFetch<ProjectWithMilestones>(`/projects/${id}/with-milestones`);
  } catch {
    return null;
  }
}

export async function getProjectDetail(
  id: string,
): Promise<(ProjectWithMilestones & { activities: ActivityWithMilestoneName[] }) | null> {
  try {
    return await apiFetch<ProjectWithMilestones & { activities: ActivityWithMilestoneName[] }>(
      `/projects/${id}/detail`,
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// milestones
// ---------------------------------------------------------------------------

export async function countMilestones(): Promise<number> {
  const { count } = await apiFetch<{ count: number }>(`/milestones/count`);
  return count;
}

export async function listMilestonesWithProject(
  filter: { status?: string } = {},
): Promise<MilestoneWithProject[]> {
  return apiFetch<MilestoneWithProject[]>(`/milestones${qs({ status: filter.status })}`);
}

export async function getMilestone(id: string): Promise<Milestone | null> {
  try {
    return await apiFetch<Milestone>(`/milestones/${id}`);
  } catch {
    return null;
  }
}

export async function getMilestoneDetail(id: string): Promise<MilestoneWithFullProject | null> {
  try {
    return await apiFetch<MilestoneWithFullProject>(`/milestones/${id}/detail`);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// invitations
// ---------------------------------------------------------------------------

export async function getInvitation(id: string): Promise<Invitation | null> {
  try {
    return await apiFetch<Invitation>(`/invitations/${id}`);
  } catch {
    return null;
  }
}

export async function listPendingInvitations(projectId: string): Promise<Invitation[]> {
  return apiFetch<Invitation[]>(`/projects/${projectId}/invitations`);
}

// ---------------------------------------------------------------------------
// companies & people (company-unification PR1)
// ---------------------------------------------------------------------------

/** The company the signed-in user acts as (their single membership). */
export async function getMyCompany(): Promise<Company> {
  return apiFetch<Company>(`/companies/me`);
}

/** Members of the given company. */
export async function listCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  return apiFetch<CompanyMember[]>(`/companies/${companyId}/members`);
}

/** Companies the signed-in user belongs to. */
export async function listMyCompanies(): Promise<Company[]> {
  return apiFetch<Company[]>(`/companies`);
}

/** Name search across every company — for the project-creation picker. */
export async function searchCompanies(q?: string): Promise<CompanySummary[]> {
  return apiFetch<CompanySummary[]>(`/companies${qs({ q, scope: "search" })}`);
}

// ---------------------------------------------------------------------------
// activity
// ---------------------------------------------------------------------------

export async function recentActivities(limit: number): Promise<RecentActivity[]> {
  return apiFetch<RecentActivity[]>(`/activity/recent${qs({ limit })}`);
}
