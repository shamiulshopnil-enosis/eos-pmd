import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

// Mongoose models mirroring the previous Prisma schema (see prisma/schema.prisma
// in git history). Relations are plain ObjectId refs; the data layer
// (src/lib/data.ts) assembles the nested shapes the pages expect.

const PROJECT_STATUS = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"] as const;
const PROJECT_VISIBILITY = ["PRIVATE", "PUBLIC"] as const;
const RELEASE_STATUS = [
  "DRAFT",
  "IN_PROGRESS",
  "DELIVERED",
  "FEEDBACK_REQUESTED",
  "REVIEWED",
  "CLOSED",
] as const;
const FEEDBACK_REQUEST_STATUS = ["PENDING", "COMPLETED"] as const;
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

const projectSchema = new Schema(
  {
    name: { type: String, required: true },
    clientCompanyName: { type: String, required: true },
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

const releaseSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    versionLabel: { type: String, default: null },
    description: { type: String, default: null },
    objectives: { type: String, default: null },
    deliverables: { type: String, default: null },
    plannedDeliveryDate: { type: Date, default: null },
    actualDeliveryDate: { type: Date, default: null },
    startDate: { type: Date, default: null },
    status: { type: String, enum: RELEASE_STATUS, default: "DRAFT" },
    demoUrl: { type: String, default: null },
    internalNotes: { type: String, default: null },
    clientFacingNotes: { type: String, default: null },
    teamSize: { type: Number, default: null },
  },
  { timestamps: true },
);

const feedbackRequestSchema = new Schema({
  releaseId: { type: Schema.Types.ObjectId, ref: "Release", required: true, unique: true },
  clientEmail: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: FEEDBACK_REQUEST_STATUS, default: "PENDING" },
  sentAt: { type: Date, default: Date.now },
  remindersSent: { type: Number, default: 0 },
  completedAt: { type: Date, default: null },

  overallSatisfaction: { type: Number, default: null },
  qualityOfDeliverables: { type: Number, default: null },
  timeliness: { type: Number, default: null },
  communication: { type: Number, default: null },
  understandingOfRequirements: { type: Number, default: null },
  deliveryAgainstScope: { type: Number, default: null },
  wouldContinue: { type: Number, default: null },
  comments: { type: String, default: null },
  reviewerEmail: { type: String, default: null },
  verified: { type: Boolean, default: true },
  flagged: { type: Boolean, default: false },
});

const activitySchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  releaseId: { type: Schema.Types.ObjectId, ref: "Release", default: null },
  type: { type: String, enum: ACTIVITY_TYPE, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// --- Identity (Milestones plan, Phase 0) ---

const USER_ROLE = ["buyer", "vendor", "admin"] as const;
const LOGIN_CODE_PURPOSE = ["login", "invite"] as const;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    role: { type: String, enum: USER_ROLE, default: "buyer" },
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

export type ProjectDoc = InferSchemaType<typeof projectSchema>;
export type ReleaseDoc = InferSchemaType<typeof releaseSchema>;
export type FeedbackRequestDoc = InferSchemaType<typeof feedbackRequestSchema>;
export type ActivityDoc = InferSchemaType<typeof activitySchema>;
export type UserDoc = InferSchemaType<typeof userSchema>;
export type LoginCodeDoc = InferSchemaType<typeof loginCodeSchema>;

export const ProjectModel =
  (models.Project as mongoose.Model<ProjectDoc>) ?? model<ProjectDoc>("Project", projectSchema);
export const ReleaseModel =
  (models.Release as mongoose.Model<ReleaseDoc>) ?? model<ReleaseDoc>("Release", releaseSchema);
export const FeedbackRequestModel =
  (models.FeedbackRequest as mongoose.Model<FeedbackRequestDoc>) ??
  model<FeedbackRequestDoc>("FeedbackRequest", feedbackRequestSchema);
export const ActivityModel =
  (models.Activity as mongoose.Model<ActivityDoc>) ??
  model<ActivityDoc>("Activity", activitySchema);
export const UserModel =
  (models.User as mongoose.Model<UserDoc>) ?? model<UserDoc>("User", userSchema);
export const LoginCodeModel =
  (models.LoginCode as mongoose.Model<LoginCodeDoc>) ??
  model<LoginCodeDoc>("LoginCode", loginCodeSchema);
