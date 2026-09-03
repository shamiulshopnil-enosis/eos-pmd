// Company-model unification PR2. Ability on a project derives from the user's company role on
// the side their company sits on, plus (for plain members) whether they're assigned.
// Every predicate takes the `ProjectAccess` the API resolves for the request.

import { ForbiddenException } from "@nestjs/common";
import type { CompanyRole, ProjectAccess } from "./types";

const EMPTY: ProjectAccess = {
  deliveryRole: null,
  reviewRole: null,
  assignedDelivery: false,
  assignedReview: false,
};

export const access = (a?: ProjectAccess | null): ProjectAccess => a ?? EMPTY;

const isLead = (role: CompanyRole | null) => role === "owner" || role === "admin";

/** Owner/admin of the delivering company, or an assigned delivery-company member. */
export const deliveryMember = (a: ProjectAccess) =>
  isLead(a.deliveryRole) || (a.deliveryRole === "member" && a.assignedDelivery);
/** Owner/admin of the receiving company, or an assigned receiving-company member. */
export const reviewMember = (a: ProjectAccess) =>
  isLead(a.reviewRole) || (a.reviewRole === "member" && a.assignedReview);

export const deliveryLead = (a: ProjectAccess) => isLead(a.deliveryRole);
export const reviewLead = (a: ProjectAccess) => isLead(a.reviewRole);

/** Can see the project at all. */
export const canViewProject = (a: ProjectAccess) => deliveryMember(a) || reviewMember(a);

// --- Action-level ---

/** Project shell, status, admin submission, publication, request completion/capstone. */
export const canManageProject = (a: ProjectAccess) => deliveryLead(a);
export const canEditMilestone = (a: ProjectAccess) => deliveryMember(a);
export const canSendMilestone = (a: ProjectAccess) => deliveryMember(a);
export const canRequestReconsideration = (a: ProjectAccess) => deliveryMember(a);
export const canRequestCapstone = (a: ProjectAccess) => deliveryLead(a);
export const canManageDeliveryStaffing = (a: ProjectAccess) => deliveryLead(a);

/** Any receiving-company member with access may submit the one milestone rating. */
export const canRateMilestone = (a: ProjectAccess) => reviewMember(a);
/** …and the same people may reject a milestone that was sent to them. */
export const canRejectMilestone = (a: ProjectAccess) => reviewMember(a);
export const canConfirmCompletion = (a: ProjectAccess) => reviewLead(a);
export const canSubmitCapstone = (a: ProjectAccess) => reviewLead(a);
export const canManageReviewStaffing = (a: ProjectAccess) => reviewLead(a);

/** Either side may attach files to a milestone. */
export const canAttachToMilestone = (a: ProjectAccess) => canViewProject(a);

export function assertPermission(ok: boolean, message = "You do not have permission to do that."): void {
  if (!ok) throw new ForbiddenException(message);
}
