/**
 * Additive seed: make **IT-Geeks** the *client* (review side) on a handful of
 * projects delivered by two other companies — Acquaint Softtech and Rushkar
 * Technology — so the IT-Geeks sign-in accounts become genuinely dual-role and
 * the top-bar Delivery/Client switch + the client dashboard have real data.
 *
 *   npm run db:seed:geek-client
 *   npm run db:seed:geek-client -- "C:\\path\\acquaint.csv" "C:\\path\\rushkar.csv"
 *
 * This does NOT wipe anything. It is idempotent: every project it creates is
 * tagged `internalRef` = "ACQ-<id>" / "RUSH-<id>", and a re-run deletes just
 * those projects (and their milestones/activities) before re-inserting. The two
 * delivering companies + their invented teammates are upserted by name.
 *
 * IT-Geeks must already exist (run `npm run db:seed:itgeeks` first).
 */

import { readFileSync } from "fs";
import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongoose";
import {
  ActivityModel,
  CompanyMemberModel,
  CompanyModel,
  MilestoneModel,
  ProjectModel,
} from "../src/lib/models";
import { minReviewThreshold } from "../src/lib/constants";

type Id = mongoose.Types.ObjectId;
const oid = () => new mongoose.Types.ObjectId();
const DAY = 864e5;

const DEFAULT_CSVS = {
  ACQ: "C:\\Users\\MdShamiulIslamShopni\\Documents\\Work Docs\\acquaint_softtech_projects.csv",
  RUSH: "C:\\Users\\MdShamiulIslamShopni\\Documents\\Work Docs\\rushkar_technology_projects.csv",
};

const IT_GEEKS = "IT-Geeks";

// The delivering companies we introduce, with invented teammates (no logins —
// they only staff projects and own milestones).
const DELIVERERS = [
  {
    ref: "ACQ",
    name: "Acquaint Softtech",
    ownerEmail: "owner@acquaint.example",
    ownerName: "Acquaint Softtech",
    team: [
      { name: "Mihir Trivedi", email: "mihir@acquaint.example" },
      { name: "Karan Shah", email: "karan@acquaint.example" },
      { name: "Priya Menon", email: "priya@acquaint.example" },
      { name: "Dev Patel", email: "dev@acquaint.example" },
    ],
  },
  {
    ref: "RUSH",
    name: "Rushkar Technology",
    ownerEmail: "owner@rushkar.example",
    ownerName: "Rushkar Technology",
    team: [
      { name: "Ankit Rao", email: "ankit@rushkar.example" },
      { name: "Sneha Iyer", email: "sneha@rushkar.example" },
      { name: "Vikram Bose", email: "vikram@rushkar.example" },
      { name: "Neha Kulkarni", email: "neha@rushkar.example" },
    ],
  },
] as const;

// CSV rows to import, per company, with the delivery shape we want on the
// dashboard (`completed` → all milestones reviewed; `ongoing` → a reviewed run,
// one milestone awaiting IT-Geeks' review, and some drafts).
const PICKS: Record<string, { id: string; mode: "completed" | "ongoing" }[]> = {
  ACQ: [
    { id: "2591", mode: "completed" }, // AI Document Intelligence Platform for Fintech
    { id: "2603", mode: "completed" }, // Centralized Property Intelligence Platform
    { id: "2611", mode: "completed" }, // Backend Modernization & Compliance Audit for MAP FinTech
    { id: "2649", mode: "ongoing" }, //  Multi-tenant Backend Architecture for Juna AI
    { id: "2639", mode: "ongoing" }, //  Workflow Management Platform
    { id: "2625", mode: "ongoing" }, //  E-Learning Website Development
  ],
  RUSH: [
    { id: "9743", mode: "completed" }, // Mobile Social Feed App (iOS & Android)
    { id: "9737", mode: "completed" }, // Cross-Platform Mobile & Web App for PEPPER
    { id: "9612", mode: "completed" }, // Website Development for Zink Foodservice
    { id: "9663", mode: "ongoing" }, //  E-Commerce Platform & Mobile Apps
    { id: "9681", mode: "ongoing" }, //  Cross-Platform RV Trip-Planning App
    { id: "9703", mode: "ongoing" }, //  MVP Development — React/Python/LLM for Freeplay
  ],
};

// ---------------------------------------------------------------------------
// tiny helpers (self-contained, mirrors scripts/seed-itgeeks.ts)
// ---------------------------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&#x2F;/gi, "/")
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
const stripTags = (s: string) =>
  decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function liItems(html: string): string[] {
  const out: string[] = [];
  const re = /<li>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const t = stripTags(m[1]);
    if (t) out.push(t);
  }
  return out;
}

function parseDate(s: string): Date | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  const d = new Date(t.length <= 10 ? `${t}T00:00:00.000Z` : t);
  return Number.isNaN(d.getTime()) ? null : d;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RFC-4180-ish parser: handles quoted fields, "" escapes and stray newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f !== "")) rows.push(row);
  }
  return rows;
}

const ENGAGEMENT_BY_CODE: Record<string, string> = {
  "1": "Fixed Price",
  "2": "Dedicated Team",
  "3": "Time & Materials",
};

const COMMENTS_BY_TIER = {
  high: [
    "Delivered on scope and on time — communication was clear throughout.",
    "Happy with the quality here; the team was responsive to every change request.",
    "Solid work. A couple of small tweaks after review, all handled quickly.",
    "Matched what we asked for closely and the hand-over was thorough.",
  ],
  mid: [
    "Broadly on track, but a few requirements were missed on the first pass.",
    "Acceptable outcome — communication could have been tighter around the timeline.",
    "Got there in the end; it needed a couple of rounds of rework.",
  ],
  low: [
    "This slipped well past the agreed date and the quality wasn't where we needed it.",
    "Several things didn't match the brief; a lot of back-and-forth to correct.",
    "Disappointed with this milestone — planning and status updates fell short.",
  ],
};

const DIMS = ["deliverables", "timeliness", "understanding", "planning", "communication"] as const;

/** Five 1–5 dimension scores + their average, spread across the bands. */
function balancedRatings(rand: () => number, fit: number): { ratings: Record<string, number>; avg: number } {
  const f = clamp((fit - 84) / 12, -1, 1);
  const weights = [0.12, 0.5, 0.24, 0.11, 0.03].map((w, i) =>
    Math.max(0.01, w + [0.05, 0.04, -0.03, -0.04, -0.02][i] * f),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  let pick = rand() * total;
  let band = weights.findIndex((w) => (pick -= w) <= 0);
  if (band < 0) band = 1;

  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  if (band === 0) {
    const ratings: Record<string, number> = {};
    for (const d of DIMS) ratings[d] = 5;
    return { ratings, avg: 5 };
  }
  const floorWanted = [0, 4, 3, 2, 1][band];
  const lo = [0, 4.0, 3.0, 2.0, 1.2][band];
  const width = [0, 0.8, 0.85, 0.85, 0.7][band];
  const target = lo + rand() * width;
  const vals = DIMS.map(() => clamp(Math.round(target + (rand() - 0.5) * 2.2), 1, 5));
  for (let guard = 0; guard < 30; guard++) {
    const m = mean(vals);
    const got = m >= 5 ? 5 : Math.max(1, Math.floor(m));
    if (got === floorWanted) break;
    if (got > floorWanted) {
      const j = vals.indexOf(Math.max(...vals));
      if (vals[j] > 1) vals[j] -= 1;
      else break;
    } else {
      const j = vals.indexOf(Math.min(...vals));
      if (vals[j] < 5) vals[j] += 1;
      else break;
    }
  }
  const ratings: Record<string, number> = {};
  DIMS.forEach((d, i) => (ratings[d] = vals[i]));
  return { ratings, avg: Math.round(mean(vals) * 100) / 100 };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

type Reviewer = { userId: Id; name: string | null; email: string };

async function upsertDeliverer(
  d: (typeof DELIVERERS)[number],
): Promise<{ companyId: Id; owner: { email: string; name: string }; team: { _id: Id; email: string; name: string }[] }> {
  const company = await CompanyModel.findOne({ name: d.name }).lean();
  let companyId: Id;
  if (company) {
    companyId = company._id as Id;
  } else {
    companyId = oid();
    await CompanyModel.collection.insertOne({
      _id: companyId,
      name: d.name,
      claimed: false,
      createdByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const wanted = [
    { email: d.ownerEmail, name: d.ownerName, role: "owner" as const },
    ...d.team.map((t) => ({ email: t.email, name: t.name, role: "member" as const })),
  ];
  const team: { _id: Id; email: string; name: string }[] = [];
  for (const w of wanted) {
    const existing = await CompanyMemberModel.findOne({ companyId, email: w.email }).lean();
    let _id: Id;
    if (existing) {
      _id = existing._id as Id;
    } else {
      _id = oid();
      await CompanyMemberModel.collection.insertOne({
        _id,
        companyId,
        email: w.email,
        name: w.name,
        role: w.role,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    if (w.role === "member") team.push({ _id, email: w.email, name: w.name });
  }
  return { companyId, owner: { email: d.ownerEmail, name: d.ownerName }, team };
}

function loadCsv(path: string) {
  const table = parseCsv(readFileSync(path, "utf8"));
  const header = table[0];
  const col = (name: string) => header.indexOf(name);
  const idx = {
    id: col("id"),
    name: col("name"),
    deliverables: col("deliverables"),
    summary: col("summary"),
    clientDesignation: col("clientDesignation"),
    teamSize: col("teamSize"),
    engagementModel: col("engagementModel"),
    completionStatus: col("completionStatus"),
    startDate: col("startDate"),
    endDate: col("endDate"),
    fitScore: col("fitScore"),
    projectUrl: col("projectUrl"),
    createdAt: col("createdAt"),
    updatedAt: col("updatedAt"),
  };
  const byId = new Map<string, string[]>();
  for (const r of table.slice(1)) if (r[idx.id]?.trim()) byId.set(r[idx.id].trim(), r);
  return { idx, byId };
}

async function main() {
  const acqCsv = process.argv[2] || DEFAULT_CSVS.ACQ;
  const rushCsv = process.argv[3] || DEFAULT_CSVS.RUSH;

  await connectToDatabase();

  // --- IT-Geeks (receiving side) -------------------------------------------
  const itGeeks = await CompanyModel.findOne({ name: IT_GEEKS }).lean();
  if (!itGeeks) {
    throw new Error(`Company "${IT_GEEKS}" not found. Run "npm run db:seed:itgeeks" first.`);
  }
  const itGeeksId = itGeeks._id as Id;
  const itGeeksOwners = (await CompanyMemberModel.find({
    companyId: itGeeksId,
    userId: { $ne: null },
  }).lean()) as Record<string, unknown>[];
  if (itGeeksOwners.length === 0) {
    throw new Error("IT-Geeks has no linked owner accounts — cannot stamp reviews.");
  }
  const reviewers: Reviewer[] = itGeeksOwners.map((m) => ({
    userId: m.userId as Id,
    name: (m.name as string) ?? null,
    email: String(m.email),
  }));
  const receivingMemberIds = itGeeksOwners.map((m) => m._id as Id);
  const clientContactsEmbedded = itGeeksOwners.map((m, i) => ({
    userId: m.userId as Id,
    email: String(m.email),
    name: (m.name as string) ?? null,
    designation: i === 0 ? "Primary Contact" : "Reviewer",
    role: i === 0 ? "primary" : "collaborator",
    invitePending: false,
  }));

  // --- delivering companies ---------------------------------------------------
  const csvByRef: Record<string, ReturnType<typeof loadCsv>> = {
    ACQ: loadCsv(acqCsv),
    RUSH: loadCsv(rushCsv),
  };

  const projectDocs: Record<string, unknown>[] = [];
  const milestoneDocs: Record<string, unknown>[] = [];
  const activityDocs: Record<string, unknown>[] = [];
  const newRefs: string[] = [];

  for (const d of DELIVERERS) {
    const { companyId, owner, team } = await upsertDeliverer(d);
    const { idx, byId } = csvByRef[d.ref];
    const vendorTeamEmbedded = [
      { userId: null, email: owner.email, name: owner.name, role: "owner" as const, invitePending: true },
    ];

    let seq = 0;
    for (const pick of PICKS[d.ref]) {
      const r = byId.get(pick.id);
      if (!r) {
        console.warn(`  ! ${d.ref} row ${pick.id} not found in CSV — skipped`);
        continue;
      }
      const k = seq++;
      const rand = mulberry32(Number(pick.id) || 1);
      const title = decodeEntities(r[idx.name].trim());
      const internalRef = `${d.ref}-${pick.id}`;
      newRefs.push(internalRef);

      const completed = pick.mode === "completed";
      const start = parseDate(r[idx.startDate]) ?? new Date(Date.now() - 300 * DAY);
      const csvEnd = parseDate(r[idx.endDate]);
      const fit = Number.parseFloat(r[idx.fitScore]) || 85;
      const teamSize = Number.parseInt(r[idx.teamSize], 10);
      const projectUrl = r[idx.projectUrl]?.trim() || null;
      const roleTitle =
        decodeEntities(r[idx.clientDesignation]?.trim() || "").split(",")[0]?.trim() || "Client Contact";

      // milestone titles from the CSV deliverables list
      const deliverables = liItems(r[idx.deliverables] || "");
      const fallback = [
        "Discovery & requirements",
        "Design & build",
        "Integration & configuration",
        "QA & fixes",
        "Launch & hand-over",
      ];
      const titles = (deliverables.length >= 3 ? deliverables : [...deliverables, ...fallback])
        .slice(0, clamp(deliverables.length || 4, 3, 6))
        .map((t) => (t.length > 90 ? `${t.slice(0, 87)}…` : t));
      const n = titles.length;

      const reviewedUpto = completed ? n : Math.max(1, n - 2);
      const sentIdx = completed ? -1 : reviewedUpto;
      const now = Date.now();

      // Per-milestone due + reviewedAt timelines.
      const dueAt: number[] = [];
      const reviewedAt: (number | null)[] = [];
      if (completed) {
        const horizon = csvEnd ?? new Date(Math.min(now, start.getTime() + 200 * DAY));
        const span = Math.max(horizon.getTime() - start.getTime(), n * 7 * DAY);
        for (let i = 0; i < n; i++) {
          const due = start.getTime() + (span * (i + 1)) / n;
          dueAt.push(due);
          reviewedAt.push(due + (2 + Math.floor(rand() * 6)) * DAY);
        }
      } else {
        const lastOffset = [2, 4, 6, 9, 14, 22][k % 6]; // newest review this many days back
        const step = 16 + (k % 3) * 8;
        for (let j = 0; j < reviewedUpto; j++) {
          const rev = now - (lastOffset + (reviewedUpto - 1 - j) * step) * DAY;
          reviewedAt.push(rev);
          dueAt.push(rev - (2 + Math.floor(rand() * 5)) * DAY);
        }
        // the "with client" milestone: half fresh, half already stale (>7d) so
        // the client dashboard's "overdue to review" is exercised.
        const stale = k % 2 === 1;
        if (sentIdx >= 0 && sentIdx < n) {
          dueAt.push(now - (stale ? 12 + (k % 5) : -4 - (k % 4)) * DAY);
          reviewedAt.push(null);
        }
        // remaining drafts — some already past due (overdue from the vendor).
        for (let i = dueAt.length; i < n; i++) {
          const overdueDraft = k % 3 === 0;
          dueAt.push(now + (overdueDraft ? -(2 + (k % 6)) : 10 + (i - sentIdx) * 14) * DAY);
          reviewedAt.push(null);
        }
      }

      const projectId = oid();
      let reviewedCount = 0;

      for (let i = 0; i < n; i++) {
        const msId = oid();
        const due = new Date(dueAt[i]);
        const prevDue = i > 0 ? dueAt[i - 1] : completed ? start.getTime() : due.getTime() - 24 * DAY;
        const msStart = new Date(Math.min(prevDue, due.getTime() - DAY));
        let status: "draft" | "sent" | "reviewed" = "draft";
        if (i < reviewedUpto) status = "reviewed";
        else if (i === sentIdx) status = "sent";

        const assignees = [...team]
          .sort(() => rand() - 0.5)
          .slice(0, 1 + Math.floor(rand() * 2))
          .map((m) => ({ userId: null, email: m.email, name: m.name }));

        const base: Record<string, unknown> = {
          _id: msId,
          projectId,
          title: titles[i],
          description: `<ul><li>${titles[i]}</li></ul>`,
          url: null,
          startDate: msStart,
          dueDate: due,
          status,
          assignees,
          attachments: [],
          ratings: null,
          ratingNotes: null,
          reviewDraft: null,
          rating: null,
          comment: null,
          editRequestedByVendor: false,
          ratingSubmittedAt: null,
          reviewedAt: null,
          reviewedByUserId: null,
          reviewedByName: null,
          reviewedByEmail: null,
          sentAt: null,
          rejectedAt: null,
          rejectedByUserId: null,
          rejectedByName: null,
          rejectedByEmail: null,
          rejectionReason: null,
          createdAt: msStart,
          updatedAt: due,
        };

        activityDocs.push({
          _id: oid(),
          projectId,
          milestoneId: msId,
          type: "RELEASE_CREATED",
          message: `Milestone "${titles[i]}" created`,
          createdAt: msStart,
        });

        if (status === "sent" || status === "reviewed") {
          const anchor =
            status === "reviewed" && reviewedAt[i] != null
              ? (reviewedAt[i] as number) - (3 + Math.floor(rand() * 5)) * DAY
              : Math.min(due.getTime() - 3 * DAY, now - 2 * DAY);
          base.sentAt = new Date(anchor);
          activityDocs.push({
            _id: oid(),
            projectId,
            milestoneId: msId,
            type: "FEEDBACK_REQUESTED",
            message: `Sent "${titles[i]}" for client review`,
            createdAt: base.sentAt,
          });
        }

        if (status === "reviewed") {
          reviewedCount++;
          const who = reviewers[(k + i) % reviewers.length];
          const { ratings, avg } = balancedRatings(rand, fit);
          const tier = avg >= 4 ? "high" : avg >= 3 ? "mid" : "low";
          const cmts = COMMENTS_BY_TIER[tier];
          const rev = new Date(reviewedAt[i] ?? due.getTime() + 3 * DAY);
          base.ratings = ratings;
          base.rating = avg;
          base.comment = cmts[Math.floor(rand() * cmts.length)];
          base.reviewedAt = rev;
          base.ratingSubmittedAt = rev;
          base.reviewedByUserId = who.userId;
          base.reviewedByName = who.name;
          base.reviewedByEmail = who.email;
          base.updatedAt = rev;
          activityDocs.push({
            _id: oid(),
            projectId,
            milestoneId: msId,
            type: "FEEDBACK_RECEIVED",
            message: `Client reviewed "${titles[i]}" (${avg.toFixed(1)}/5)`,
            createdAt: rev,
          });
        }

        milestoneDocs.push(base);
      }

      const reviewedRatings = milestoneDocs
        .filter((m) => (m.projectId as Id).equals(projectId) && m.status === "reviewed")
        .map((m) => m.rating as number);
      const liveScore =
        reviewedRatings.length > 0
          ? Math.round((reviewedRatings.reduce((a, b) => a + b, 0) / reviewedRatings.length) * 100) / 100
          : null;

      projectDocs.push({
        _id: projectId,
        name: title,
        clientCompanyName: IT_GEEKS,
        clientCompanyId: null,
        deliveringCompanyId: companyId,
        receivingCompanyId: itGeeksId,
        deliveringCompanyName: d.name,
        receivingCompanyName: IT_GEEKS,
        clientContactName: reviewers[0].name,
        clientEmail: reviewers[0].email,
        services: "Software Development",
        description: stripTags(r[idx.summary] || ""),
        startDate: start,
        expectedCompletionDate: completed ? csvEnd : null,
        actualCompletionDate: completed ? csvEnd : null,
        status: completed ? "COMPLETED" : "ACTIVE",
        teamSize: Number.isFinite(teamSize) ? teamSize : null,
        engagementModel: ENGAGEMENT_BY_CODE[r[idx.engagementModel]?.trim()] ?? null,
        internalRef,
        projectUrl,
        visibility: "PRIVATE",
        adminStatus: "published",
        executionStatus: completed ? "completed" : "ongoing",
        minReviewThreshold: minReviewThreshold(n),
        completionRequestedAt: completed && csvEnd ? new Date(csvEnd.getTime() - 4 * DAY) : null,
        completionConfirmedByClient: completed,
        completionForcedByAdmin: false,
        liveScore,
        reviewedMilestoneCount: reviewedCount,
        finalScore: completed ? liveScore : null,
        vendorTeam: vendorTeamEmbedded,
        clientContacts: clientContactsEmbedded,
        assignedMemberIds: team.map((m) => m._id),
        receivingMemberIds,
        capstone: null,
        publicSummary: null,
        publicKeyChallenges: null,
        publicSolution: null,
        publicOutcome: null,
        publicTechStack: null,
        publicPlatforms: null,
        publicBudget: null,
        publicImageUrl: null,
        publicPerformanceConsent: false,
        publishedAt: null,
        createdAt: parseDate(r[idx.createdAt]) ?? start,
        updatedAt: new Date(),
      });

      activityDocs.push({
        _id: oid(),
        projectId,
        milestoneId: null,
        type: "PROJECT_CREATED",
        message: `Project "${title}" created for ${IT_GEEKS}`,
        createdAt: start,
      });
      void roleTitle;
    }
  }

  // --- idempotent replace -------------------------------------------------
  const stale = (await ProjectModel.find({ internalRef: { $in: newRefs } })
    .select({ _id: 1 })
    .lean()) as { _id: Id }[];
  if (stale.length) {
    const ids = stale.map((p) => p._id);
    const [ms, ac] = await Promise.all([
      MilestoneModel.deleteMany({ projectId: { $in: ids } }),
      ActivityModel.deleteMany({ projectId: { $in: ids } }),
    ]);
    await ProjectModel.deleteMany({ _id: { $in: ids } });
    console.log(
      `Replaced ${ids.length} existing project(s) (removed ${ms.deletedCount ?? 0} milestones, ${ac.deletedCount ?? 0} activities).`,
    );
  }

  await ProjectModel.collection.insertMany(projectDocs);
  await MilestoneModel.collection.insertMany(milestoneDocs);
  await ActivityModel.collection.insertMany(activityDocs);

  const completedN = projectDocs.filter((p) => p.executionStatus === "completed").length;
  console.log("\nDone.");
  console.log(`  delivering companies : ${DELIVERERS.map((d) => d.name).join(", ")}`);
  console.log(`  client (review side) : ${IT_GEEKS}`);
  console.log(
    `  projects             : ${projectDocs.length} (${completedN} completed, ${projectDocs.length - completedN} ongoing)`,
  );
  console.log(`  milestones           : ${milestoneDocs.length}`);
  console.log("  sign in as           : admin@eos.local, vendor@eos.local, shopnil16@gmail.com");
  console.log("  → the top-bar Delivery/Client switch now appears; pick Client.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
