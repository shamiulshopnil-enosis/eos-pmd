import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongoose";
import {
  ActivityModel,
  InvitationModel,
  MilestoneModel,
  ProjectModel,
  UserModel,
} from "../src/lib/models";
import { minReviewThreshold } from "../src/lib/constants";
import { runningAverage } from "../src/lib/scoring";
import { tierForScore } from "../src/lib/attributes";
import { SEED_USERS, seedUsers } from "./seed-users";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n: number) {
  return daysAgo(-n);
}

/** Upsert someone a seed project attaches (already accepted + signed in). Idempotent. */
async function ensureUser(email: string, name: string, role: "buyer" | "vendor" | "admin" = "buyer") {
  return UserModel.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, role }, $set: { name, emailVerified: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

type MilestoneSeed = {
  title: string;
  description?: string;
  targetDate?: Date | null;
  status: "draft" | "sent" | "reviewed";
  rating?: number;
  comment?: string;
  reviewedAt?: Date;
  sentAt?: Date;
};

async function addMilestone(projectId: mongoose.Types.ObjectId, m: MilestoneSeed) {
  return MilestoneModel.create({
    projectId,
    title: m.title,
    description: m.description ?? "",
    targetDate: m.targetDate ?? null,
    status: m.status,
    rating: m.rating ?? null,
    comment: m.comment ?? null,
    reviewedAt: m.reviewedAt ?? null,
    ratingSubmittedAt: m.reviewedAt ?? null,
    sentAt: m.sentAt ?? (m.status !== "draft" ? m.reviewedAt ?? daysAgo(2) : null),
  });
}

async function main() {
  await connectToDatabase();

  console.log("Resetting database…");
  await Promise.all([
    ProjectModel.deleteMany({}),
    MilestoneModel.deleteMany({}),
    ActivityModel.deleteMany({}),
    InvitationModel.deleteMany({}),
  ]);

  // Sign-in accounts are not wiped, only ensured (see scripts/seed-users.ts).
  await seedUsers();
  const vendorEmail = SEED_USERS.find((u) => u.role === "vendor")!.email;
  const vendorOwner = await UserModel.findOne({ email: vendorEmail });

  // Extra people the seed projects attach as accepted members.
  const vendorMember = await ensureUser("member@eos.local", "Riley Chen", "vendor");
  const primaryContact = await ensureUser("dana.okafor@northpeak.example", "Dana Okafor");
  const collaborator = await ensureUser("wes.hart@northpeak.example", "Wes Hart");
  const completedContact = await ensureUser("priya.menon@brightwave.example", "Priya Menon");

  const ownerEntry = {
    userId: vendorOwner?._id ?? null,
    email: vendorEmail,
    name: vendorOwner?.name ?? "Vendor Owner",
    role: "owner" as const,
    invitePending: false,
  };
  const memberEntry = {
    userId: vendorMember._id,
    email: vendorMember.email,
    name: vendorMember.name,
    role: "member" as const,
    invitePending: false,
  };

  // -------------------------------------------------------------------------
  // Project 1 — WHOLE project: one milestone, rated once on delivery,
  //   published to the public portfolio.
  // -------------------------------------------------------------------------
  const p1 = await ProjectModel.create({
    name: "Corporate Rebrand Rollout",
    clientCompanyName: "Gravity77 Pty Ltd",
    clientContactName: "Saz Virk",
    clientEmail: "saz.virk@gravity77.example",
    services: "Brand Strategy, Website Development",
    description: "A single fixed-scope engagement: a new identity applied across the site and collateral.",
    startDate: daysAgo(120),
    expectedCompletionDate: daysAgo(10),
    status: "ACTIVE",
    teamSize: 4,
    engagementModel: "Fixed Price",
    internalRef: "GRV-2026-07",
    projectType: "whole",
    adminStatus: "published",
    executionStatus: "ongoing",
    minReviewThreshold: 1,
    visibility: "PUBLIC",
    publishedAt: daysAgo(30),
    publicSummary: "Gravity77 engaged the team for a full rebrand rollout across web and print.",
    publicKeyChallenges: "Applying a brand-new identity consistently across every existing template at once.",
    publicSolution: "One coordinated cutover with a single client sign-off on the finished rollout.",
    publicOutcome: "Delivered on scope with a strong client review.",
    publicTechStack: "Next.js, Figma",
    publicPlatforms: "Web",
    publicBudget: "10K – 49K",
    publicPerformanceConsent: true,
    vendorTeam: [ownerEntry, memberEntry],
    clientContacts: [
      {
        userId: null,
        email: "saz.virk@gravity77.example",
        name: "Saz Virk",
        designation: "Marketing Director",
        role: "primary",
        invitePending: true,
      },
    ],
  });

  const p1m1 = await addMilestone(p1._id, {
    title: "Whole Project — Corporate Rebrand Rollout",
    description: "<p>The complete engagement, reviewed once on delivery.</p>",
    targetDate: daysAgo(10),
    status: "reviewed",
    rating: 5,
    comment: "Exactly what we hoped for — polished and delivered on time.",
    reviewedAt: daysAgo(8),
  });

  await ActivityModel.insertMany([
    { projectId: p1._id, type: "PROJECT_CREATED", message: `Project "${p1.name}" created for ${p1.clientCompanyName}` },
    { projectId: p1._id, milestoneId: p1m1._id, type: "FEEDBACK_RECEIVED", message: `Client reviewed "${p1m1.title}" (5/5)`, createdAt: daysAgo(8) },
    { projectId: p1._id, type: "PROJECT_PUBLISHED", message: "Project published to public portfolio", createdAt: daysAgo(30) },
  ]);

  // -------------------------------------------------------------------------
  // Project 2 — MILESTONE project, still ONGOING and BELOW the review
  //   threshold (1 of 5 reviewed, threshold 2). Vendor team of 2, an accepted
  //   primary contact + collaborator, and one still-pending collaborator invite.
  //   Carries an overdue draft and a milestone stuck with the client.
  // -------------------------------------------------------------------------
  const p2 = await ProjectModel.create({
    name: "E-commerce Platform Development",
    clientCompanyName: "NorthPeak Logistics",
    clientContactName: "Dana Okafor",
    clientEmail: "dana.okafor@northpeak.example",
    services: "Mobile Application Development, Web Development",
    description: "Cross-platform e-commerce build delivered as a sequence of milestones.",
    startDate: daysAgo(80),
    expectedCompletionDate: daysFromNow(40),
    status: "ACTIVE",
    teamSize: 5,
    engagementModel: "Dedicated Team",
    internalRef: "NPL-2026-03",
    projectType: "milestone",
    adminStatus: "published",
    executionStatus: "ongoing",
    minReviewThreshold: 2,
    visibility: "PUBLIC",
    publishedAt: daysAgo(15),
    publicSummary: "An incremental e-commerce delivery with a client review after each milestone.",
    publicPerformanceConsent: true,
    vendorTeam: [ownerEntry, memberEntry],
    clientContacts: [
      {
        userId: primaryContact._id,
        email: primaryContact.email,
        name: primaryContact.name,
        designation: "Product Lead",
        role: "primary",
        invitePending: false,
      },
      {
        userId: collaborator._id,
        email: collaborator.email,
        name: collaborator.name,
        designation: "Engineering Manager",
        role: "collaborator",
        invitePending: false,
      },
      {
        userId: null,
        email: "leah.kim@northpeak.example",
        name: null,
        designation: "Collaborator",
        role: "collaborator",
        invitePending: true,
      },
    ],
  });

  const p2m1 = await addMilestone(p2._id, {
    title: "Milestone 1 — Product Catalog",
    description: "<ul><li>Catalog UI</li><li>Search API</li><li>Product detail pages</li></ul>",
    targetDate: daysAgo(50),
    status: "reviewed",
    rating: 4,
    comment: "Solid catalog. A couple of small tweaks after review, handled quickly.",
    reviewedAt: daysAgo(44),
  });
  const p2m2 = await addMilestone(p2._id, {
    title: "Milestone 2 — Shopping Cart & Checkout",
    description: "<ul><li>Cart</li><li>Checkout flow</li><li>Promo codes</li></ul>",
    targetDate: daysAgo(12),
    status: "sent",
    sentAt: daysAgo(9),
  });
  const p2m3 = await addMilestone(p2._id, {
    title: "Milestone 3 — Payment Integration",
    description: "<ul><li>Stripe integration</li><li>Refunds</li><li>Receipts</li></ul>",
    targetDate: daysAgo(3),
    status: "draft",
  });
  await addMilestone(p2._id, {
    title: "Milestone 4 — Customer Dashboard",
    description: "<ul><li>Order history</li><li>Account settings</li></ul>",
    targetDate: daysFromNow(20),
    status: "draft",
  });
  await addMilestone(p2._id, {
    title: "Milestone 5 — Production Launch",
    description: "<ul><li>App store submission</li><li>Launch monitoring</li></ul>",
    targetDate: daysFromNow(45),
    status: "draft",
  });

  await InvitationModel.create({
    email: "leah.kim@northpeak.example",
    projectId: p2._id,
    kind: "client_contact",
    proposedRole: "collaborator",
    invitedByUserId: primaryContact._id,
    status: "pending",
  });

  await ActivityModel.insertMany([
    { projectId: p2._id, type: "PROJECT_CREATED", message: `Project "${p2.name}" created for ${p2.clientCompanyName}` },
    { projectId: p2._id, milestoneId: p2m1._id, type: "FEEDBACK_RECEIVED", message: `Client reviewed "${p2m1.title}" (4/5)`, createdAt: daysAgo(44) },
    { projectId: p2._id, milestoneId: p2m2._id, type: "FEEDBACK_REQUESTED", message: `Sent "${p2m2.title}" for client review`, createdAt: daysAgo(9) },
    { projectId: p2._id, milestoneId: p2m3._id, type: "RELEASE_CREATED", message: `Milestone "${p2m3.title}" created` },
    { projectId: p2._id, type: "PROJECT_UPDATED", message: "Invited leah.kim@northpeak.example as a collaborator" },
  ]);

  // -------------------------------------------------------------------------
  // Project 3 — MILESTONE project, COMPLETED with a locked final score and a
  //   submitted capstone endorsement. Published, so the capstone shows on the
  //   public preview.
  // -------------------------------------------------------------------------
  const p3 = await ProjectModel.create({
    name: "Marketing Site Redesign",
    clientCompanyName: "BrightWave Media",
    clientContactName: "Priya Menon",
    clientEmail: "priya.menon@brightwave.example",
    services: "Website Development, UI/UX Design",
    description: "Full redesign of the corporate marketing site and blog platform.",
    startDate: daysAgo(200),
    expectedCompletionDate: daysAgo(70),
    actualCompletionDate: daysAgo(72),
    status: "COMPLETED",
    teamSize: 3,
    engagementModel: "Fixed Price",
    internalRef: "BWM-2025-11",
    projectType: "milestone",
    adminStatus: "published",
    executionStatus: "completed",
    minReviewThreshold: 1,
    liveScore: 5,
    finalScore: 5,
    reviewedMilestoneCount: 3,
    completionRequestedAt: daysAgo(76),
    completionConfirmedByClient: true,
    visibility: "PUBLIC",
    publishedAt: daysAgo(60),
    publicSummary: "A ground-up redesign of BrightWave's marketing site, delivered milestone by milestone.",
    publicOutcome: "Consistently strong client reviews across the whole engagement.",
    publicTechStack: "Next.js, Sanity",
    publicPlatforms: "Web",
    publicBudget: "50K – 99K",
    publicPerformanceConsent: true,
    vendorTeam: [ownerEntry, memberEntry],
    clientContacts: [
      {
        userId: completedContact._id,
        email: completedContact.email,
        name: completedContact.name,
        designation: "Head of Marketing",
        role: "primary",
        invitePending: false,
      },
    ],
    capstone: {
      requested: true,
      submitted: true,
      attributes: ["Exceeded expectations", "Reliable delivery", "Great collaboration"],
      testimonial:
        "The team delivered every milestone on time and the quality was consistently excellent. We would work with them again without hesitation.",
      anonymous: false,
      tier: tierForScore(5),
      requestedAt: daysAgo(20),
      submittedAt: daysAgo(18),
    },
  });

  const p3m1 = await addMilestone(p3._id, {
    title: "Milestone 1 — Homepage & Design System",
    targetDate: daysAgo(172),
    status: "reviewed",
    rating: 5,
    comment: "Loved the new homepage — great collaboration throughout.",
    reviewedAt: daysAgo(165),
  });
  const p3m2 = await addMilestone(p3._id, {
    title: "Milestone 2 — Blog Platform",
    targetDate: daysAgo(120),
    status: "reviewed",
    rating: 5,
    comment: "Reliable delivery, no surprises.",
    reviewedAt: daysAgo(113),
  });
  const p3m3 = await addMilestone(p3._id, {
    title: "Milestone 3 — Launch & Handover",
    targetDate: daysAgo(80),
    status: "reviewed",
    rating: 5,
    comment: "Smooth launch and a thorough handover.",
    reviewedAt: daysAgo(78),
  });

  await ActivityModel.insertMany([
    { projectId: p3._id, type: "PROJECT_CREATED", message: `Project "${p3.name}" created for ${p3.clientCompanyName}` },
    { projectId: p3._id, milestoneId: p3m1._id, type: "FEEDBACK_RECEIVED", message: `Client reviewed "${p3m1.title}" (5/5)`, createdAt: daysAgo(165) },
    { projectId: p3._id, milestoneId: p3m2._id, type: "FEEDBACK_RECEIVED", message: `Client reviewed "${p3m2.title}" (5/5)`, createdAt: daysAgo(113) },
    { projectId: p3._id, milestoneId: p3m3._id, type: "FEEDBACK_RECEIVED", message: `Client reviewed "${p3m3.title}" (5/5)`, createdAt: daysAgo(78) },
    { projectId: p3._id, type: "PROJECT_COMPLETED", message: "Client confirmed completion — final score locked at 5.0", createdAt: daysAgo(74) },
    { projectId: p3._id, type: "FEEDBACK_RECEIVED", message: "Client submitted a capstone endorsement", createdAt: daysAgo(18) },
  ]);

  // Keep the stored score fields in sync with the seeded milestones (Phase 5).
  // `finalScore` is left as set above — it only locks at completion (Phase 6).
  for (const p of [p1, p2, p3]) {
    const ms = await MilestoneModel.find({ projectId: p._id }).select("status rating").lean();
    const reviewed = ms.filter((m) => m.status === "reviewed" && m.rating != null);
    await ProjectModel.updateOne(
      { _id: p._id },
      {
        $set: {
          liveScore: runningAverage(ms),
          reviewedMilestoneCount: reviewed.length,
          minReviewThreshold: minReviewThreshold(ms.length),
        },
      },
    );
  }

  console.log("Seed complete:");
  console.log(`  ${p1.name} — whole project, published, reviewed`);
  console.log(`  ${p2.name} — milestone project, ongoing, below review threshold, pending collaborator invite`);
  console.log(`  ${p3.name} — milestone project, completed, capstone endorsement submitted`);
  console.log("Sign in at /login as vendor@eos.local, admin@eos.local, or dana.okafor@northpeak.example.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
