import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongoose";
import { ActivityModel, MilestoneModel, ProjectModel, UserModel } from "../src/lib/models";
import { SEED_USERS, seedUsers } from "./seed-users";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n: number) {
  return daysAgo(-n);
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
    sentAt: m.sentAt ?? (m.status !== "draft" ? m.reviewedAt ?? daysAgo(1) : null),
  });
}

async function main() {
  await connectToDatabase();

  console.log("Resetting database…");
  await Promise.all([
    ProjectModel.deleteMany({}),
    MilestoneModel.deleteMany({}),
    ActivityModel.deleteMany({}),
  ]);

  // Sign-in accounts are not wiped, only ensured (see scripts/seed-users.ts).
  await seedUsers();
  const vendorEmail = SEED_USERS.find((u) => u.role === "vendor")!.email;
  const vendorUser = await UserModel.findOne({ email: vendorEmail });

  // Every seeded project: the seed vendor is the founding Owner; the named client
  // contact is a pending Primary Contact (accept via /invite once invited).
  const people = (clientEmail: string, clientContactName: string) => ({
    vendorTeam: [
      {
        userId: vendorUser?._id ?? null,
        email: vendorEmail,
        name: vendorUser?.name ?? "Vendor Owner",
        role: "owner",
        invitePending: false,
      },
    ],
    clientContacts: [
      {
        userId: null,
        email: clientEmail,
        name: clientContactName,
        designation: "Client Contact",
        role: "primary",
        invitePending: true,
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Project 1 — healthy, active, five milestones, ALREADY PUBLISHED
  // ---------------------------------------------------------------------
  const p1 = await ProjectModel.create({
    name: "E-commerce Platform Development",
    clientCompanyName: "Gravity77 Pty Ltd",
    clientContactName: "Saz Virk",
    clientEmail: "saz.virk@gravity77.example",
    services: "Mobile Application Development, Web Development",
    description:
      "Full-cycle build of a cross-platform e-commerce app: catalog, cart, payments, and a customer dashboard.",
    startDate: daysAgo(150),
    expectedCompletionDate: daysFromNow(40),
    status: "ACTIVE",
    teamSize: 5,
    engagementModel: "Offshore",
    internalRef: "GRV-2026-01",
    ...people("saz.virk@gravity77.example", "Saz Virk"),
    projectType: "milestone",
    adminStatus: "published",
    executionStatus: "ongoing",
    minReviewThreshold: 2,
    visibility: "PUBLIC",
    publishedAt: daysAgo(20),
    publicSummary:
      "Gravity77 engaged the team to build a cross-platform e-commerce app end to end, from product catalog through to a production launch.",
    publicKeyChallenges: "Tight timeline across catalog, cart, and payment integration in parallel workstreams.",
    publicSolution: "Delivered as incremental milestones with a client review collected after each one.",
    publicOutcome: "Consistently high client satisfaction across every reviewed milestone.",
    publicTechStack: "React Native, Node.js, Stripe",
    publicPlatforms: "iOS, Android",
    publicBudget: "50K – 99K",
    publicPerformanceConsent: true,
  });

  const p1m1 = await addMilestone(p1._id, {
    title: "Milestone 1 — Product Catalog",
    description: "<p>Browsable product catalog with search and filtering.</p><ul><li>Catalog UI</li><li>Search API</li><li>Product detail pages</li></ul>",
    targetDate: daysAgo(122),
    status: "reviewed",
    rating: 5,
    comment: "Great start — the catalog exceeded expectations and communication was excellent throughout.",
    reviewedAt: daysAgo(115),
  });
  const p1m2 = await addMilestone(p1._id, {
    title: "Milestone 2 — Shopping Cart",
    description: "<ul><li>Cart</li><li>Checkout flow</li><li>Promo codes</li></ul>",
    targetDate: daysAgo(92),
    status: "reviewed",
    rating: 5,
    comment: "Smooth checkout, no complaints.",
    reviewedAt: daysAgo(85),
  });
  const p1m3 = await addMilestone(p1._id, {
    title: "Milestone 3 — Payment Integration",
    description: "<ul><li>Stripe integration</li><li>Refunds</li><li>Receipts</li></ul>",
    targetDate: daysAgo(32),
    status: "reviewed",
    rating: 4,
    comment: "Payment integration works well; one minor bug fixed quickly after we flagged it.",
    reviewedAt: daysAgo(25),
  });
  const p1m4 = await addMilestone(p1._id, {
    title: "Milestone 4 — Customer Dashboard",
    description: "<ul><li>Order history</li><li>Account settings</li><li>Saved addresses</li></ul>",
    targetDate: daysFromNow(3),
    status: "sent",
    sentAt: daysAgo(1),
  });
  await addMilestone(p1._id, {
    title: "Milestone 5 — Production Launch",
    description: "<ul><li>App store submission</li><li>Production infra</li><li>Launch monitoring</li></ul>",
    targetDate: daysFromNow(40),
    status: "draft",
  });

  await ActivityModel.insertMany([
    { projectId: p1._id, type: "PROJECT_CREATED", message: `Project "${p1.name}" created for ${p1.clientCompanyName}` },
    { projectId: p1._id, milestoneId: p1m1._id, type: "RELEASE_CREATED", message: `Milestone "${p1m1.title}" created` },
    { projectId: p1._id, milestoneId: p1m1._id, type: "FEEDBACK_RECEIVED", message: `"${p1m1.title}" reviewed (5/5)`, createdAt: daysAgo(115) },
    { projectId: p1._id, milestoneId: p1m2._id, type: "FEEDBACK_RECEIVED", message: `"${p1m2.title}" reviewed (5/5)`, createdAt: daysAgo(85) },
    { projectId: p1._id, milestoneId: p1m3._id, type: "FEEDBACK_RECEIVED", message: `"${p1m3.title}" reviewed (4/5)`, createdAt: daysAgo(25) },
    { projectId: p1._id, milestoneId: p1m4._id, type: "FEEDBACK_REQUESTED", message: `Sent "${p1m4.title}" for client review`, createdAt: daysAgo(1) },
    { projectId: p1._id, type: "PUBLICATION_REQUESTED", message: "Publication requested by vendor", createdAt: daysAgo(20) },
    { projectId: p1._id, type: "PROJECT_PUBLISHED", message: "Project published to public portfolio", createdAt: daysAgo(20) },
  ]);

  // ---------------------------------------------------------------------
  // Project 2 — declining satisfaction, one overdue milestone (At Risk)
  // ---------------------------------------------------------------------
  const p2 = await ProjectModel.create({
    name: "Internal Tools Revamp",
    clientCompanyName: "NorthPeak Logistics",
    clientContactName: "Dana Okafor",
    clientEmail: "dana.okafor@northpeak.example",
    services: "Web Development",
    description: "Modernizing NorthPeak's internal ops tooling: auth, reporting, and notifications.",
    startDate: daysAgo(100),
    expectedCompletionDate: daysFromNow(30),
    status: "ACTIVE",
    teamSize: 3,
    engagementModel: "Dedicated Team",
    internalRef: "NPL-2026-03",
    ...people("dana.okafor@northpeak.example", "Dana Okafor"),
    projectType: "milestone",
    adminStatus: "published",
    executionStatus: "ongoing",
    minReviewThreshold: 1,
  });

  const p2m1 = await addMilestone(p2._id, {
    title: "Milestone 1 — Auth Module",
    description: "<ul><li>SSO login</li><li>Role-based access control</li></ul>",
    targetDate: daysAgo(62),
    status: "reviewed",
    rating: 3,
    comment: "Functional, but we had to chase status updates a few times.",
    reviewedAt: daysAgo(55),
  });
  const p2m2 = await addMilestone(p2._id, {
    title: "Milestone 2 — Reporting Dashboard",
    description: "<ul><li>Ops KPI dashboard</li><li>CSV export</li></ul>",
    targetDate: daysAgo(17),
    status: "reviewed",
    rating: 2,
    comment: "Several reports didn't match the agreed spec and needed rework after delivery.",
    reviewedAt: daysAgo(12),
  });
  const p2m3 = await addMilestone(p2._id, {
    title: "Milestone 3 — Notifications",
    description: "<ul><li>Email + in-app alerts for exceptions</li></ul>",
    targetDate: daysAgo(5),
    status: "draft",
  });

  await ActivityModel.insertMany([
    { projectId: p2._id, type: "PROJECT_CREATED", message: `Project "${p2.name}" created for ${p2.clientCompanyName}` },
    { projectId: p2._id, milestoneId: p2m1._id, type: "FEEDBACK_RECEIVED", message: `"${p2m1.title}" reviewed (3/5)`, createdAt: daysAgo(55) },
    { projectId: p2._id, milestoneId: p2m2._id, type: "FEEDBACK_RECEIVED", message: `"${p2m2.title}" reviewed (2/5)`, createdAt: daysAgo(12) },
    { projectId: p2._id, milestoneId: p2m3._id, type: "RELEASE_CREATED", message: `Milestone "${p2m3.title}" created` },
  ]);

  // ---------------------------------------------------------------------
  // Project 3 — completed engagement, consistently strong, still private
  // ---------------------------------------------------------------------
  const p3 = await ProjectModel.create({
    name: "Marketing Site Redesign",
    clientCompanyName: "BrightWave Media",
    clientContactName: "Priya Menon",
    clientEmail: "priya.menon@brightwave.example",
    services: "Website Development, UI/UX Design",
    description: "Full redesign of the corporate marketing site and blog platform.",
    startDate: daysAgo(200),
    expectedCompletionDate: daysAgo(70),
    actualCompletionDate: daysAgo(75),
    status: "COMPLETED",
    teamSize: 3,
    engagementModel: "Fixed Price",
    internalRef: "BWM-2025-11",
    ...people("priya.menon@brightwave.example", "Priya Menon"),
    projectType: "milestone",
    adminStatus: "published",
    executionStatus: "completed",
    minReviewThreshold: 1,
    liveScore: 5,
    finalScore: 5,
    reviewedMilestoneCount: 2,
    completionConfirmedByClient: true,
  });

  const p3m1 = await addMilestone(p3._id, {
    title: "Milestone 1 — Homepage",
    targetDate: daysAgo(172),
    status: "reviewed",
    rating: 5,
    comment: "Loved the new homepage — great collaboration.",
    reviewedAt: daysAgo(165),
  });
  const p3m2 = await addMilestone(p3._id, {
    title: "Milestone 2 — Blog Platform",
    targetDate: daysAgo(80),
    status: "reviewed",
    rating: 5,
    comment: "Consistently reliable delivery across the whole engagement.",
    reviewedAt: daysAgo(73),
  });

  await ActivityModel.insertMany([
    { projectId: p3._id, type: "PROJECT_CREATED", message: `Project "${p3.name}" created for ${p3.clientCompanyName}` },
    { projectId: p3._id, milestoneId: p3m1._id, type: "FEEDBACK_RECEIVED", message: `"${p3m1.title}" reviewed (5/5)`, createdAt: daysAgo(165) },
    { projectId: p3._id, milestoneId: p3m2._id, type: "FEEDBACK_RECEIVED", message: `"${p3m2.title}" reviewed (5/5)`, createdAt: daysAgo(73) },
    { projectId: p3._id, type: "PROJECT_COMPLETED", message: "Project status changed to COMPLETED", createdAt: daysAgo(75) },
  ]);

  // ---------------------------------------------------------------------
  // Project 4 — brand new, no milestones yet, pending admin approval
  // ---------------------------------------------------------------------
  const p4 = await ProjectModel.create({
    name: "New Client Onboarding Portal",
    clientCompanyName: "Delta Freight Co",
    clientContactName: "Marcus Lee",
    clientEmail: "marcus.lee@deltafreight.example",
    services: "Web Development",
    description: "Self-service onboarding portal for new Delta Freight carrier partners.",
    startDate: daysAgo(3),
    expectedCompletionDate: daysFromNow(90),
    status: "ACTIVE",
    teamSize: 2,
    engagementModel: "Offshore",
    ...people("marcus.lee@deltafreight.example", "Marcus Lee"),
    projectType: "milestone",
    adminStatus: "pending_approval",
    executionStatus: "ongoing",
    minReviewThreshold: 0,
  });

  await ActivityModel.create({
    projectId: p4._id,
    type: "PROJECT_CREATED",
    message: `Project "${p4.name}" created for ${p4.clientCompanyName}`,
  });

  console.log("Seed complete:");
  console.log(`  ${p1.name} (published, milestone 4 with the client)`);
  console.log(`  ${p2.name} (declining / at-risk, milestone 3 overdue)`);
  console.log(`  ${p3.name} (completed, strong history)`);
  console.log(`  ${p4.name} (empty, pending admin approval)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
