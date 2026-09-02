import { Schema } from "mongoose";

// Ported verbatim from the Next.js app's src/lib/models.ts. Raw Mongoose Schema
// objects registered through MongooseModule.forFeature — same collections, same
// shapes, so the two apps read and write the one database interchangeably.

const PROJECT_STATUS = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"] as const;
const PROJECT_VISIBILITY = ["PRIVATE", "PUBLIC"] as const;
const PROJECT_TYPE = ["whole", "milestone"] as const;
const ADMIN_STATUS = ["draft", "pending_approval", "published", "rejected", "edited", "trashed"] as const;
const EXECUTION_STATUS = ["ongoing", "awaiting_completion", "completed"] as const;
const MILESTONE_STATUS = ["draft", "sent", "reviewed"] as const;
const CAPSTONE_TIER = ["promoter", "neutral", "detractor"] as const;
const VENDOR_TEAM_ROLE = ["owner", "member"] as const;
const VENDOR_MEMBER_ROLE = ["owner", "member"] as const;
const CLIENT_CONTACT_ROLE = ["primary", "collaborator"] as const;
const INVITATION_KIND = ["vendor_team", "client_contact"] as const;
const INVITATION_ROLE = ["owner", "member", "primary", "collaborator"] as const;
const INVITATION_STATUS = ["pending", "accepted", "revoked"] as const;
const ACTIVITY_TYPE = [
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "RELEASE_CREATED",
  "RELEASE_UPDATED",
  "RELEASE_DELIVERED",
  "FEEDBACK_REQUESTED",
  "FEEDBACK_REMINDER_SENT",
  "FEEDBACK_RECEIVED",
  "PROJECT_COMPLETED",
  "PUBLICATION_REQUESTED",
  "PROJECT_PUBLISHED",
] as const;

const USER_ROLE = ["buyer", "vendor", "admin"] as const;
const LOGIN_CODE_PURPOSE = ["login", "invite"] as const;

const vendorTeamMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    role: { type: String, enum: VENDOR_TEAM_ROLE, default: "member" },
    invitePending: { type: Boolean, default: true },
  },
  { _id: false },
);

const clientContactSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    designation: { type: String, default: "" },
    role: { type: String, enum: CLIENT_CONTACT_ROLE, default: "collaborator" },
    invitePending: { type: Boolean, default: true },
  },
  { _id: false },
);

const capstoneEndorsementSchema = new Schema(
  {
    requested: { type: Boolean, default: false },
    submitted: { type: Boolean, default: false },
    attributes: { type: [String], default: [] },
    testimonial: { type: String, default: "" },
    anonymous: { type: Boolean, default: false },
    tier: { type: String, enum: CAPSTONE_TIER, default: "neutral" },
    requestedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
  },
  { _id: false },
);

// Vendor-owned people directory. A vendor maintains a pool of teammates once
// (name + email + a default project role); teams and individual project
// assignments reference these by id. `userId` is filled the first time the
// person signs in with this email (see UsersService.findOrCreate).
export const VendorMemberSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    role: { type: String, enum: VENDOR_MEMBER_ROLE, default: "member" },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
VendorMemberSchema.index({ ownerUserId: 1, email: 1 }, { unique: true });

// A named grouping of VendorMember ids, owned by one vendor. Assigning a team to
// a project is a live reference: the project's vendor team always reflects the
// team's current membership.
export const TeamSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    memberIds: { type: [{ type: Schema.Types.ObjectId, ref: "VendorMember" }], default: [] },
  },
  { timestamps: true },
);

// Global, shared directory of client companies. A vendor searches this when
// creating a project; if the company is not found they add it once and it is
// reusable on every later project.
export const ClientCompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    contactName: { type: String, default: null },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    designation: { type: String, default: "" },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
ClientCompanySchema.index({ name: 1 });

export const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    clientCompanyName: { type: String, required: true },
    clientCompanyId: { type: Schema.Types.ObjectId, ref: "ClientCompany", default: null },
    clientContactName: { type: String, default: null },
    clientEmail: { type: String, required: true },
    services: { type: String, default: null },
    description: { type: String, default: null },
    startDate: { type: Date, default: null },
    expectedCompletionDate: { type: Date, default: null },
    actualCompletionDate: { type: Date, default: null },
    status: { type: String, enum: PROJECT_STATUS, default: "ACTIVE" },
    teamSize: { type: Number, default: null },
    engagementModel: { type: String, default: null },
    internalRef: { type: String, default: null },
    projectUrl: { type: String, default: null },
    visibility: { type: String, enum: PROJECT_VISIBILITY, default: "PRIVATE" },

    projectType: { type: String, enum: PROJECT_TYPE, default: "whole" },
    adminStatus: { type: String, enum: ADMIN_STATUS, default: "draft" },
    executionStatus: { type: String, enum: EXECUTION_STATUS, default: "ongoing" },
    minReviewThreshold: { type: Number, default: 0 },
    completionRequestedAt: { type: Date, default: null },
    completionConfirmedByClient: { type: Boolean, default: false },
    completionForcedByAdmin: { type: Boolean, default: false },
    liveScore: { type: Number, default: null },
    reviewedMilestoneCount: { type: Number, default: 0 },
    finalScore: { type: Number, default: null },

    vendorTeam: { type: [vendorTeamMemberSchema], default: [] },
    clientContacts: { type: [clientContactSchema], default: [] },

    // Live-reference vendor staffing (Team Management feature). The effective
    // vendor team on a project read is `vendorTeam` (the founding owner + any
    // grandfathered rows) merged with the current membership of these.
    assignedTeamIds: { type: [{ type: Schema.Types.ObjectId, ref: "Team" }], default: [] },
    assignedMemberIds: { type: [{ type: Schema.Types.ObjectId, ref: "VendorMember" }], default: [] },

    capstone: { type: capstoneEndorsementSchema, default: null },

    publicSummary: { type: String, default: null },
    publicKeyChallenges: { type: String, default: null },
    publicSolution: { type: String, default: null },
    publicOutcome: { type: String, default: null },
    publicTechStack: { type: String, default: null },
    publicPlatforms: { type: String, default: null },
    publicBudget: { type: String, default: null },
    publicImageUrl: { type: String, default: null },
    publicPerformanceConsent: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A vendor teammate a milestone is assigned to. Snapshotted from the project's
// vendor team at assign time (email is the stable key; userId is null until the
// person has signed in).
const milestoneAssigneeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: null },
  },
  { _id: false },
);

// An uploaded file. Bytes live in the `milestone_files` GridFS bucket; this
// subdocument is the metadata and points at the GridFS file by `fileId`.
const milestoneAttachmentSchema = new Schema(
  {
    fileId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    uploadedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    uploadedByName: { type: String, default: null },
    uploadedByEmail: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

// Client milestone review — the five delivery dimensions ported from the Enosis
// "Client Feedback Form" (items 1–5). Each is 1–5 (5 = best). `rating` on the
// milestone stays as their average so all existing scoring keeps working.
const milestoneReviewSchema = new Schema(
  {
    deliverables: { type: Number, default: null }, // quality of deliverables
    timeliness: { type: Number, default: null }, // meeting this milestone's deadlines
    understanding: { type: Number, default: null }, // grasp of requirements
    planning: { type: Number, default: null }, // planning & estimate accuracy
    communication: { type: Number, default: null }, // clarity, responsiveness
  },
  { _id: false },
);

export const MilestoneSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    url: { type: String, default: null },
    targetDate: { type: Date, default: null },
    status: { type: String, enum: MILESTONE_STATUS, default: "draft" },
    assignees: { type: [milestoneAssigneeSchema], default: [] },
    attachments: { type: [milestoneAttachmentSchema], default: [] },
    ratings: { type: milestoneReviewSchema, default: null },
    rating: { type: Number, default: null }, // average of `ratings`, drives scoring
    comment: { type: String, default: null },
    editRequestedByVendor: { type: Boolean, default: false },
    ratingSubmittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedByName: { type: String, default: null },
    reviewedByEmail: { type: String, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const ActivitySchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  milestoneId: { type: Schema.Types.ObjectId, ref: "Milestone", default: null },
  type: { type: String, enum: ACTIVITY_TYPE, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    role: { type: String, enum: USER_ROLE, default: "buyer" },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const LoginCodeSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  codeHash: { type: String, required: true },
  purpose: { type: String, enum: LOGIN_CODE_PURPOSE, default: "login" },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  consumedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const InvitationSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    kind: { type: String, enum: INVITATION_KIND, required: true },
    proposedRole: { type: String, enum: INVITATION_ROLE, required: true },
    designation: { type: String, default: null },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: INVITATION_STATUS, default: "pending" },
  },
  { timestamps: true },
);

// Collection/model names — must match what the Next.js app registered so both
// map to the same MongoDB collections (projects, milestones, activities, ...).
export const MODEL = {
  Project: "Project",
  Milestone: "Milestone",
  Activity: "Activity",
  User: "User",
  LoginCode: "LoginCode",
  Invitation: "Invitation",
  VendorMember: "VendorMember",
  Team: "Team",
  ClientCompany: "ClientCompany",
} as const;
