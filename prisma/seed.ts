import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n: number) {
  return daysAgo(-n);
}

async function main() {
  console.log("Resetting database…");
  await prisma.project.deleteMany();

  // ---------------------------------------------------------------------
  // Project 1 — healthy, active, multiple releases, ALREADY PUBLISHED
  // ---------------------------------------------------------------------
  const p1 = await prisma.project.create({
    data: {
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
      visibility: "PUBLIC",
      publishedAt: daysAgo(20),
      publicSummary:
        "Gravity77 engaged the team to build a cross-platform e-commerce app end to end, from product catalog through to a production launch.",
      publicKeyChallenges: "Tight timeline across catalog, cart, and payment integration in parallel workstreams.",
      publicSolution: "Delivered in five incremental releases with a client evaluation collected after each one.",
      publicOutcome: "Consistently high client satisfaction across every reviewed release.",
      publicTechStack: "React Native, Node.js, Stripe",
      publicPlatforms: "iOS, Android",
      publicBudget: "50K – 99K",
      publicPerformanceConsent: true,
    },
  });

  const p1r1 = await prisma.release.create({
    data: {
      projectId: p1.id,
      name: "Release 1 — Product Catalog",
      versionLabel: "v1.0",
      description: "Browsable product catalog with search and filtering.",
      deliverables: "Catalog UI, search API, product detail pages",
      startDate: daysAgo(150),
      plannedDeliveryDate: daysAgo(122),
      actualDeliveryDate: daysAgo(120),
      status: "CLOSED",
      teamSize: 4,
    },
  });
  await prisma.feedbackRequest.create({
    data: {
      releaseId: p1r1.id,
      clientEmail: "saz.virk@gravity77.example",
      token: "demo-p1r1-completed",
      status: "COMPLETED",
      sentAt: daysAgo(119),
      completedAt: daysAgo(115),
      overallSatisfaction: 5,
      qualityOfDeliverables: 5,
      timeliness: 4,
      communication: 5,
      understandingOfRequirements: 5,
      deliveryAgainstScope: 5,
      wouldContinue: 5,
      comments: "Great start — the catalog exceeded expectations and communication was excellent throughout.",
      reviewerEmail: "saz.virk@gravity77.example",
    },
  });

  const p1r2 = await prisma.release.create({
    data: {
      projectId: p1.id,
      name: "Release 2 — Shopping Cart",
      versionLabel: "v1.1",
      deliverables: "Cart, checkout flow, promo codes",
      startDate: daysAgo(118),
      plannedDeliveryDate: daysAgo(92),
      actualDeliveryDate: daysAgo(90),
      status: "CLOSED",
      teamSize: 4,
    },
  });
  await prisma.feedbackRequest.create({
    data: {
      releaseId: p1r2.id,
      clientEmail: "saz.virk@gravity77.example",
      token: "demo-p1r2-completed",
      status: "COMPLETED",
      sentAt: daysAgo(89),
      completedAt: daysAgo(85),
      overallSatisfaction: 5,
      qualityOfDeliverables: 5,
      timeliness: 5,
      communication: 4,
      understandingOfRequirements: 5,
      deliveryAgainstScope: 5,
      wouldContinue: 5,
      comments: "Smooth checkout, no complaints.",
      reviewerEmail: "saz.virk@gravity77.example",
    },
  });

  const p1r3 = await prisma.release.create({
    data: {
      projectId: p1.id,
      name: "Release 3 — Payment Integration",
      versionLabel: "v1.2",
      deliverables: "Stripe integration, refunds, receipts",
      startDate: daysAgo(60),
      plannedDeliveryDate: daysAgo(32),
      actualDeliveryDate: daysAgo(30),
      status: "CLOSED",
      teamSize: 3,
    },
  });
  await prisma.feedbackRequest.create({
    data: {
      releaseId: p1r3.id,
      clientEmail: "saz.virk@gravity77.example",
      token: "demo-p1r3-completed",
      status: "COMPLETED",
      sentAt: daysAgo(29),
      completedAt: daysAgo(25),
      overallSatisfaction: 4,
      qualityOfDeliverables: 4,
      timeliness: 4,
      communication: 4,
      wouldContinue: 5,
      comments: "Payment integration works well; one minor bug fixed quickly after we flagged it.",
      reviewerEmail: "saz.virk@gravity77.example",
    },
  });

  const p1r4 = await prisma.release.create({
    data: {
      projectId: p1.id,
      name: "Release 4 — Customer Dashboard",
      versionLabel: "v1.3",
      deliverables: "Order history, account settings, saved addresses",
      startDate: daysAgo(20),
      plannedDeliveryDate: daysFromNow(3),
      status: "IN_PROGRESS",
      teamSize: 4,
      clientFacingNotes: "On track for delivery this week — final QA pass in progress.",
    },
  });

  await prisma.release.create({
    data: {
      projectId: p1.id,
      name: "Release 5 — Production Launch",
      versionLabel: "v1.0.0",
      deliverables: "App store submission, production infra, launch monitoring",
      plannedDeliveryDate: daysFromNow(40),
      status: "DRAFT",
    },
  });

  await prisma.activity.createMany({
    data: [
      { projectId: p1.id, type: "PROJECT_CREATED", message: `Project "${p1.name}" created for ${p1.clientCompanyName}` },
      { projectId: p1.id, releaseId: p1r1.id, type: "RELEASE_CREATED", message: `Release "${p1r1.name}" created` },
      { projectId: p1.id, releaseId: p1r1.id, type: "FEEDBACK_RECEIVED", message: `Client feedback received for "${p1r1.name}" (5/5 overall)`, createdAt: daysAgo(115) },
      { projectId: p1.id, releaseId: p1r2.id, type: "FEEDBACK_RECEIVED", message: `Client feedback received for "${p1r2.name}" (5/5 overall)`, createdAt: daysAgo(85) },
      { projectId: p1.id, releaseId: p1r3.id, type: "FEEDBACK_RECEIVED", message: `Client feedback received for "${p1r3.name}" (4/5 overall)`, createdAt: daysAgo(25) },
      { projectId: p1.id, releaseId: p1r4.id, type: "RELEASE_CREATED", message: `Release "${p1r4.name}" created` },
      { projectId: p1.id, type: "PUBLICATION_REQUESTED", message: "Publication requested by vendor", createdAt: daysAgo(20) },
      { projectId: p1.id, type: "PROJECT_PUBLISHED", message: "Project published to public portfolio", createdAt: daysAgo(20) },
    ],
  });

  // ---------------------------------------------------------------------
  // Project 2 — declining satisfaction, one overdue release (At Risk)
  // ---------------------------------------------------------------------
  const p2 = await prisma.project.create({
    data: {
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
    },
  });

  const p2r1 = await prisma.release.create({
    data: {
      projectId: p2.id,
      name: "Release 1 — Auth Module",
      deliverables: "SSO login, role-based access control",
      startDate: daysAgo(100),
      plannedDeliveryDate: daysAgo(62),
      actualDeliveryDate: daysAgo(60),
      status: "CLOSED",
      teamSize: 2,
    },
  });
  await prisma.feedbackRequest.create({
    data: {
      releaseId: p2r1.id,
      clientEmail: "dana.okafor@northpeak.example",
      token: "demo-p2r1-completed",
      status: "COMPLETED",
      sentAt: daysAgo(59),
      completedAt: daysAgo(55),
      overallSatisfaction: 3,
      qualityOfDeliverables: 3,
      timeliness: 3,
      communication: 3,
      wouldContinue: 3,
      comments: "Functional, but we had to chase status updates a few times.",
      reviewerEmail: "dana.okafor@northpeak.example",
    },
  });

  const p2r2 = await prisma.release.create({
    data: {
      projectId: p2.id,
      name: "Release 2 — Reporting Dashboard",
      deliverables: "Ops KPI dashboard, CSV export",
      startDate: daysAgo(50),
      plannedDeliveryDate: daysAgo(17),
      actualDeliveryDate: daysAgo(15),
      status: "CLOSED",
      teamSize: 3,
    },
  });
  await prisma.feedbackRequest.create({
    data: {
      releaseId: p2r2.id,
      clientEmail: "dana.okafor@northpeak.example",
      token: "demo-p2r2-completed",
      status: "COMPLETED",
      sentAt: daysAgo(14),
      completedAt: daysAgo(12),
      overallSatisfaction: 2,
      qualityOfDeliverables: 2,
      timeliness: 2,
      communication: 3,
      wouldContinue: 2,
      comments: "Several reports didn't match the agreed spec and needed rework after delivery.",
      reviewerEmail: "dana.okafor@northpeak.example",
    },
  });

  const p2r3 = await prisma.release.create({
    data: {
      projectId: p2.id,
      name: "Release 3 — Notifications",
      deliverables: "Email + in-app alerts for exceptions",
      startDate: daysAgo(30),
      plannedDeliveryDate: daysAgo(5),
      status: "IN_PROGRESS",
      teamSize: 2,
      internalNotes: "Blocked on client's SMTP credentials for 4 days — flagged to account manager.",
    },
  });

  await prisma.activity.createMany({
    data: [
      { projectId: p2.id, type: "PROJECT_CREATED", message: `Project "${p2.name}" created for ${p2.clientCompanyName}` },
      { projectId: p2.id, releaseId: p2r1.id, type: "FEEDBACK_RECEIVED", message: `Client feedback received for "${p2r1.name}" (3/5 overall)`, createdAt: daysAgo(55) },
      { projectId: p2.id, releaseId: p2r2.id, type: "FEEDBACK_RECEIVED", message: `Client feedback received for "${p2r2.name}" (2/5 overall)`, createdAt: daysAgo(12) },
      { projectId: p2.id, releaseId: p2r3.id, type: "RELEASE_CREATED", message: `Release "${p2r3.name}" created` },
    ],
  });

  // ---------------------------------------------------------------------
  // Project 3 — completed engagement, consistently strong, still private
  // ---------------------------------------------------------------------
  const p3 = await prisma.project.create({
    data: {
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
    },
  });

  const p3r1 = await prisma.release.create({
    data: {
      projectId: p3.id,
      name: "Release 1 — Homepage",
      startDate: daysAgo(200),
      plannedDeliveryDate: daysAgo(172),
      actualDeliveryDate: daysAgo(170),
      status: "CLOSED",
      teamSize: 3,
    },
  });
  await prisma.feedbackRequest.create({
    data: {
      releaseId: p3r1.id,
      clientEmail: "priya.menon@brightwave.example",
      token: "demo-p3r1-completed",
      status: "COMPLETED",
      sentAt: daysAgo(169),
      completedAt: daysAgo(165),
      overallSatisfaction: 5,
      qualityOfDeliverables: 5,
      timeliness: 5,
      communication: 5,
      wouldContinue: 5,
      comments: "Loved the new homepage — great collaboration.",
      reviewerEmail: "priya.menon@brightwave.example",
    },
  });

  const p3r2 = await prisma.release.create({
    data: {
      projectId: p3.id,
      name: "Release 2 — Blog Platform",
      startDate: daysAgo(160),
      plannedDeliveryDate: daysAgo(80),
      actualDeliveryDate: daysAgo(78),
      status: "CLOSED",
      teamSize: 2,
    },
  });
  await prisma.feedbackRequest.create({
    data: {
      releaseId: p3r2.id,
      clientEmail: "priya.menon@brightwave.example",
      token: "demo-p3r2-completed",
      status: "COMPLETED",
      sentAt: daysAgo(77),
      completedAt: daysAgo(73),
      overallSatisfaction: 5,
      qualityOfDeliverables: 5,
      timeliness: 4,
      communication: 5,
      wouldContinue: 5,
      comments: "Consistently reliable delivery across the whole engagement.",
      reviewerEmail: "priya.menon@brightwave.example",
    },
  });

  await prisma.activity.createMany({
    data: [
      { projectId: p3.id, type: "PROJECT_CREATED", message: `Project "${p3.name}" created for ${p3.clientCompanyName}` },
      { projectId: p3.id, releaseId: p3r1.id, type: "FEEDBACK_RECEIVED", message: `Client feedback received for "${p3r1.name}" (5/5 overall)`, createdAt: daysAgo(165) },
      { projectId: p3.id, releaseId: p3r2.id, type: "FEEDBACK_RECEIVED", message: `Client feedback received for "${p3r2.name}" (5/5 overall)`, createdAt: daysAgo(73) },
      { projectId: p3.id, type: "PROJECT_COMPLETED", message: "Project status changed to COMPLETED", createdAt: daysAgo(75) },
    ],
  });

  // ---------------------------------------------------------------------
  // Project 4 — brand new, no releases yet (empty-state demo)
  // ---------------------------------------------------------------------
  const p4 = await prisma.project.create({
    data: {
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
    },
  });

  await prisma.activity.create({
    data: { projectId: p4.id, type: "PROJECT_CREATED", message: `Project "${p4.name}" created for ${p4.clientCompanyName}` },
  });

  // ---------------------------------------------------------------------
  // One live pending feedback request so /feedback/[token] is demoable.
  // ---------------------------------------------------------------------
  await prisma.feedbackRequest.create({
    data: {
      releaseId: p1r4.id,
      clientEmail: "saz.virk@gravity77.example",
      token: "demo-pending-feedback",
      status: "PENDING",
      sentAt: daysAgo(1),
    },
  });
  await prisma.release.update({
    where: { id: p1r4.id },
    data: { status: "FEEDBACK_REQUESTED", actualDeliveryDate: daysAgo(1) },
  });
  await prisma.activity.create({
    data: {
      projectId: p1.id,
      releaseId: p1r4.id,
      type: "FEEDBACK_REQUESTED",
      message: "Feedback requested from saz.virk@gravity77.example",
      createdAt: daysAgo(1),
    },
  });

  console.log("Seed complete:");
  console.log(`  ${p1.name} (published) — try /feedback/demo-pending-feedback`);
  console.log(`  ${p2.name} (declining / at-risk)`);
  console.log(`  ${p3.name} (completed, strong history)`);
  console.log(`  ${p4.name} (empty state demo)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
