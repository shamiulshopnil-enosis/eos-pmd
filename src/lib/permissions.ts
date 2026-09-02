// Company-model unification PR2. What a viewer can do on a project derives from their company
// role on the side their company sits on, plus (for plain members) whether they're
// assigned. The API attaches `project.myAccess` for the requesting user.

import type { CompanyRole, ProjectAccess } from "./types";

type WithAccess = { myAccess?: ProjectAccess | null };

const EMPTY: ProjectAccess = {
  deliveryRole: null,
  reviewRole: null,
  assignedDelivery: false,
  assignedReview: false,
};
const A = (p: WithAccess): ProjectAccess => p.myAccess ?? EMPTY;
const isLead = (r: CompanyRole | null) => r === "owner" || r === "admin";

export const deliveryMember = (p: WithAccess) => {
  const a = A(p);
  return isLead(a.deliveryRole) || (a.deliveryRole === "member" && a.assignedDelivery);
};
export const reviewMember = (p: WithAccess) => {
  const a = A(p);
  return isLead(a.reviewRole) || (a.reviewRole === "member" && a.assignedReview);
};
export const deliveryLead = (p: WithAccess) => isLead(A(p).deliveryRole);
export const reviewLead = (p: WithAccess) => isLead(A(p).reviewRole);

// --- action-level ---

export const canViewProject = (p: WithAccess) => deliveryMember(p) || reviewMember(p);
/** Project shell, status, approval, publication, request completion / capstone. */
export const canManageProject = (p: WithAccess) => deliveryLead(p);
export const canAccessDelivery = (p: WithAccess) => deliveryMember(p);
export const canManageDeliveryStaffing = (p: WithAccess) => deliveryLead(p);
export const canAccessReview = (p: WithAccess) => reviewMember(p);
export const canManageReview = (p: WithAccess) => reviewLead(p);
export const canRateMilestone = (p: WithAccess) => reviewMember(p);
export const canAttachToMilestone = (p: WithAccess) => canViewProject(p);

export const reviewRoleLabel = (p: WithAccess): string => A(p).reviewRole ?? "—";
export const deliveryRoleLabel = (p: WithAccess): string => A(p).deliveryRole ?? "—";

export function assertPermission(ok: boolean, message = "You do not have permission to do that."): void {
  if (!ok) throw new Error(message);
}
