import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

// Mongoose models mirroring the previous Prisma schema (see prisma/schema.prisma
// in git history). Relations are plain ObjectId refs; the data layer
// (src/lib/data.ts) assembles the nested shapes the pages expect.

const PROJECT_STATUS = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"] as const;
const PROJECT_VISIBILITY = ["PRIVATE", "PUBLIC"] as const;
const ADMIN_STATUS = ["draft", "pending_approval", "published", "rejected", "edited", "trashed"] as const;
const EXECUTION_STATUS = ["ongoing", "awaiting_completion", "completed"] as const;
const MILESTONE_STATUS = ["draft", "sent", "reviewed", "rejected"] as const;
// Milestones plan, Phase 7.
const CAPSTONE_TIER = ["promoter", "neutral", "detractor"] as const;
// Milestones plan, Phase 3.
const VENDOR_TEAM_ROLE = ["owner", "member"] as const;
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
  "MILESTONE_REJECTED",
  "MILESTONE_REJECTION_EMAILED",
] as const;

// Milestones plan, Phase 3 — per-project people, embedded on Project.
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

// Milestones plan, Phase 7 — one-time qualitative wrap-up after completion,
// embedded on Project. `tier` is frozen from `finalScore` at request time.
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

// Legacy directories — kept registered so the numbered offline migrations
// (scripts/migrations) can still read/rename old rows. The live app no longer
// uses these; see the Company / CompanyMember models below.
const VENDOR_MEMBER_ROLE = ["owner", "member"] as const;

const vendorMemberSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    role: { type: String, enum: VENDOR_MEMBER_ROLE, default: "member" },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
vendorMemberSchema.index({ ownerUserId: 1, email: 1 }, { unique: true });

const clientCompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    contactName: { type: String, default: null },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    designation: { type: String, default: "" },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
clientCompanySchema.index({ name: 1 });

// --- Company model (company-unification PR1) — in sync with api/src/schemas ---
const COMPANY_ROLE = ["owner", "admin", "member"] as const;

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    claimed: { type: Boolean, default: false },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
companySchema.index({ name: 1 });

const companyMemberSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    role: { type: String, enum: COMPANY_ROLE, default: "member" },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
companyMemberSchema.index({ companyId: 1, email: 1 }, { unique: true });

// Legacy — the Teams concept was removed (migration 011 flattens team members
// onto each project and drops the collection). Kept registered only so the
// pre-011 migrations that touch `teams` still compile.
const teamSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true },
    memberIds: { type: [{ type: Schema.Types.ObjectId, ref: "CompanyMember" }], default: [] },
  },
  { timestamps: true },
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true },
    clientCompanyName: { type: String, required: true },
    clientCompanyId: { type: Schema.Types.ObjectId, ref: "ClientCompany", default: null }, // legacy
    deliveringCompanyId: { type: Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    receivingCompanyId: { type: Schema.Types.ObjectId, ref: "Company", default: null, index: true },
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

    adminStatus: { type: String, enum: ADMIN_STATUS, default: "draft" },
    executionStatus: { type: String, enum: EXECUTION_STATUS, default: "ongoing" },
    minReviewThreshold: { type: Number, default: 0 },
    completionRequestedAt: { type: Date, default: null },
    completionConfirmedByClient: { type: Boolean, default: false },
    completionForcedByAdmin: { type: Boolean, default: false },
    liveScore: { type: Number, default: null },
    reviewedMilestoneCount: { type: Number, default: 0 },
    finalScore: { type: Number, default: null },

    // --- Milestones plan, Phase 3 ---
    vendorTeam: { type: [vendorTeamMemberSchema], default: [] },
    clientContacts: { type: [clientContactSchema], default: [] },

    // --- company-unification live-reference staffing (delivery + receiving) ---
    assignedMemberIds: { type: [{ type: Schema.Types.ObjectId, ref: "CompanyMember" }], default: [] },
    receivingMemberIds: { type: [{ type: Schema.Types.ObjectId, ref: "CompanyMember" }], default: [] },

    // --- Milestones plan, Phase 7 ---
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

// --- Milestone (Milestones plan, Phase 2 — replaces Release + FeedbackRequest) ---
const milestoneAssigneeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: null },
  },
  { _id: false },
);

const milestoneAttachmentSchema = new Schema(
  {
    fileId: { type: Schema.Types.ObjectId, required: true }, // GridFS `milestone_files` bucket
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

// Enosis Client Feedback Form, items 1–5 — each 1–5 (5 = best).
const milestoneReviewSchema = new Schema(
  {
    deliverables: { type: Number, default: null },
    timeliness: { type: Number, default: null },
    understanding: { type: Number, default: null },
    planning: { type: Number, default: null },
    communication: { type: Number, default: null },
  },
  { _id: false },
);

const milestoneReviewNotesSchema = new Schema(
  {
    deliverables: { type: String, default: null },
    timeliness: { type: String, default: null },
    understanding: { type: String, default: null },
    planning: { type: String, default: null },
    communication: { type: String, default: null },
  },
  { _id: false },
);

const milestoneSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true }, // plain text
    description: { type: String, default: "" }, // sanitized rich-text HTML (bold + lists)
    url: { type: String, default: null }, // optional link
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: MILESTONE_STATUS, default: "draft" },
    assignees: { type: [milestoneAssigneeSchema], default: [] },
    attachments: { type: [milestoneAttachmentSchema], default: [] },
    ratings: { type: milestoneReviewSchema, default: null }, // the five review dimensions
    ratingNotes: { type: milestoneReviewNotesSchema, default: null }, // per-dimension client comments
    rating: { type: Number, default: null }, // average of `ratings`, drives scoring
    comment: { type: String, default: null },
    editRequestedByVendor: { type: Boolean, default: false },
    ratingSubmittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedByName: { type: String, default: null },
    reviewedByEmail: { type: String, default: null },
    sentAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectedByName: { type: String, default: null },
    rejectedByEmail: { type: String, default: null },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true },
);

const activitySchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  milestoneId: { type: Schema.Types.ObjectId, ref: "Milestone", default: null },
  type: { type: String, enum: ACTIVITY_TYPE, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// --- Identity (Milestones plan, Phase 0) ---

const USER_ROLE = ["admin", "member"] as const;
const LOGIN_CODE_PURPOSE = ["login", "invite"] as const;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    role: { type: String, enum: USER_ROLE, default: "member" },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const loginCodeSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  codeHash: { type: String, required: true },
  purpose: { type: String, enum: LOGIN_CODE_PURPOSE, default: "login" },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  consumedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const invitationSchema = new Schema(
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

export type ProjectDoc = InferSchemaType<typeof projectSchema>;
export type MilestoneDoc = InferSchemaType<typeof milestoneSchema>;
export type ActivityDoc = InferSchemaType<typeof activitySchema>;
export type UserDoc = InferSchemaType<typeof userSchema>;
export type LoginCodeDoc = InferSchemaType<typeof loginCodeSchema>;
export type InvitationDoc = InferSchemaType<typeof invitationSchema>;
export type VendorMemberDoc = InferSchemaType<typeof vendorMemberSchema>;
export type TeamDoc = InferSchemaType<typeof teamSchema>;
export type ClientCompanyDoc = InferSchemaType<typeof clientCompanySchema>;
export type CompanyDoc = InferSchemaType<typeof companySchema>;
export type CompanyMemberDoc = InferSchemaType<typeof companyMemberSchema>;

export const ProjectModel =
  (models.Project as mongoose.Model<ProjectDoc>) ?? model<ProjectDoc>("Project", projectSchema);
export const MilestoneModel =
  (models.Milestone as mongoose.Model<MilestoneDoc>) ?? model<MilestoneDoc>("Milestone", milestoneSchema);
export const ActivityModel =
  (models.Activity as mongoose.Model<ActivityDoc>) ??
  model<ActivityDoc>("Activity", activitySchema);
export const UserModel =
  (models.User as mongoose.Model<UserDoc>) ?? model<UserDoc>("User", userSchema);
export const LoginCodeModel =
  (models.LoginCode as mongoose.Model<LoginCodeDoc>) ??
  model<LoginCodeDoc>("LoginCode", loginCodeSchema);
export const InvitationModel =
  (models.Invitation as mongoose.Model<InvitationDoc>) ??
  model<InvitationDoc>("Invitation", invitationSchema);
export const VendorMemberModel =
  (models.VendorMember as mongoose.Model<VendorMemberDoc>) ??
  model<VendorMemberDoc>("VendorMember", vendorMemberSchema);
export const TeamModel =
  (models.Team as mongoose.Model<TeamDoc>) ?? model<TeamDoc>("Team", teamSchema);
export const ClientCompanyModel =
  (models.ClientCompany as mongoose.Model<ClientCompanyDoc>) ??
  model<ClientCompanyDoc>("ClientCompany", clientCompanySchema);
export const CompanyModel =
  (models.Company as mongoose.Model<CompanyDoc>) ??
  model<CompanyDoc>("Company", companySchema);
export const CompanyMemberModel =
  (models.CompanyMember as mongoose.Model<CompanyMemberDoc>) ??
  model<CompanyMemberDoc>("CompanyMember", companyMemberSchema);
