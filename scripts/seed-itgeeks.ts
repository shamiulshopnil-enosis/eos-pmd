/**
 * One-shot reseed: wipe every test project/company/user and import the IT-Geeks
 * portfolio from a CSV export, giving each project a set of invented milestones.
 *
 *   npm run db:seed:itgeeks            # uses the default CSV path below
 *   npm run db:seed:itgeeks -- "C:\\path\\to\\it_geeks_projects.csv"
 *
 * Decisions baked in (agreed with the product owner):
 *  - The single delivering company is renamed / created as "IT-Geeks".
 *  - Sign-in accounts kept: admin@eos.local (admin), vendor@eos.local (member),
 *    shopnil16@gmail.com (admin). All three are owners of IT-Geeks so they see
 *    every imported project. Every other user row is deleted.
 *  - Confidential / Anonymous client rows get a receiving company whose name is
 *    derived from the project title ("… for X" → "X"), contact "Anonymous".
 *  - Everything imports PRIVATE (visibility=PRIVATE, adminStatus=published).
 *    The public-portfolio fields are left empty.
 *  - Milestones: 3–6 per project, titled from the CSV "deliverables" list.
 *    Completed projects → all milestones reviewed (4–5 ratings weighted by the
 *    row's fitScore), executionStatus=completed, finalScore locked. Ongoing
 *    projects → earlier milestones reviewed, one "with client", the rest draft.
 */

import { readFileSync } from "fs";
import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongoose";
import {
  ActivityModel,
  CompanyMemberModel,
  CompanyModel,
  InvitationModel,
  MilestoneModel,
  ProjectModel,
  UserModel,
} from "../src/lib/models";
import { minReviewThreshold } from "../src/lib/constants";

type Id = mongoose.Types.ObjectId;
const oid = () => new mongoose.Types.ObjectId();

const DEFAULT_CSV =
  "C:\\Users\\MdShamiulIslamShopni\\Documents\\Work Docs\\it_geeks_projects.csv";

const KEEP_USERS: { email: string; name: string; role: "admin" | "member" }[] = [
  { email: "admin@eos.local", name: "EOS Admin", role: "admin" },
  { email: "vendor@eos.local", name: "IT-Geeks Owner", role: "member" },
  { email: "shopnil16@gmail.com", name: "Shopnil", role: "admin" },
];

const DELIVERY_COMPANY = "IT-Geeks";

// Invented IT-Geeks teammates (recurring first names from the CSV write-ups).
// They have no login; they only exist to staff projects and own milestones.
const DELIVERY_TEAMMATES = [
  { name: "Rahul Verma", email: "rahul@it-geeks.example", role: "admin" as const },
  { name: "Eva Meyer", email: "eva@it-geeks.example", role: "member" as const },
  { name: "Tom Fielding", email: "tom@it-geeks.example", role: "member" as const },
  { name: "Rob Sinclair", email: "rob@it-geeks.example", role: "member" as const },
  { name: "Amy Watson", email: "amy@it-geeks.example", role: "member" as const },
  { name: "Sanjay Nair", email: "sanjay@it-geeks.example", role: "member" as const },
  { name: "Adam Price", email: "adam@it-geeks.example", role: "member" as const },
  { name: "Emma Coates", email: "emma@it-geeks.example", role: "member" as const },
  { name: "Sam Joshi", email: "sam.joshi@it-geeks.example", role: "member" as const },
  { name: "Bob Ellis", email: "bob@it-geeks.example", role: "member" as const },
];

// ---------------------------------------------------------------------------
// tiny helpers
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

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Pull `<li>` items out of the CSV's little HTML lists. */
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

function slugForDomain(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
  return s || "client";
}

function parseDate(s: string): Date | null {
  const t = s.trim();
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
    "Great collaboration on this one — no surprises.",
    "Turnaround was faster than expected and the result looks polished.",
  ],
  mid: [
    "Broadly on track, but a few requirements were missed on the first pass.",
    "Acceptable outcome — communication could have been tighter around the timeline.",
    "Got there in the end; it needed a couple of rounds of rework.",
    "Fine overall, though the estimate and the actual effort didn't line up.",
  ],
  low: [
    "This slipped well past the agreed date and the quality wasn't where we needed it.",
    "Several things didn't match the brief; a lot of back-and-forth to correct.",
    "Disappointed with this milestone — planning and status updates fell short.",
    "Had to reopen this more than once before it was usable.",
  ],
};

const DIMS = ["deliverables", "timeliness", "understanding", "planning", "communication"] as const;

/**
 * A reviewed milestone's five 1–5 dimension scores + their average, drawn so the
 * dashboard "Rating distribution" chart spreads across all five bands instead of
 * piling into 4.0–4.9. Band is a weighted pick, nudged a little by the row's
 * fitScore; the dimensions are then generated and nudged to land in that band.
 */
function balancedRatings(rand: () => number, fit: number): { ratings: Record<string, number>; avg: number } {
  const f = clamp((fit - 84) / 12, -1, 1); // −1 weak engagement … +1 strong
  const weights = [0.12, 0.5, 0.24, 0.11, 0.03] // [5.0, 4.x, 3.x, 2.x, <2]
    .map((w, i) => Math.max(0.01, w + [0.05, 0.04, -0.03, -0.04, -0.02][i] * f));
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

async function ensureUser(email: string, name: string, role: "admin" | "member"): Promise<Id> {
  const doc = await UserModel.findOneAndUpdate(
    { email },
    { $set: { name, role, emailVerified: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc!._id as Id;
}

async function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  const raw = readFileSync(csvPath, "utf8");
  const table = parseCsv(raw);
  const header = table[0];
  const col = (name: string) => header.indexOf(name);
  const idx = {
    id: col("id"),
    name: col("name"),
    clientName: col("clientName"),
    outcomes: col("outcomes"),
    clientCompanyName: col("clientCompanyName"),
    isClientConfidential: col("isClientConfidential"),
    clientDesignation: col("clientDesignation"),
    clientEmail: col("clientEmail"),
    teamSize: col("teamSize"),
    engagementModel: col("engagementModel"),
    summary: col("summary"),
    keyChallenges: col("keyChallenges"),
    deliverables: col("deliverables"),
    solutions: col("solutions"),
    completionStatus: col("completionStatus"),
    startDate: col("startDate"),
    endDate: col("endDate"),
    fitScore: col("fitScore"),
    projectUrl: col("projectUrl"),
    createdAt: col("createdAt"),
    updatedAt: col("updatedAt"),
  };
  const dataRows = table.slice(1).filter((r) => r[idx.id]?.trim());
  console.log(`Parsed ${dataRows.length} project rows from ${csvPath}`);

  await connectToDatabase();
  const db = mongoose.connection.db!;

  // 1. Wipe -----------------------------------------------------------------
  console.log("Wiping projects / milestones / activities / invitations / companies …");
  await Promise.all([
    ProjectModel.deleteMany({}),
    MilestoneModel.deleteMany({}),
    ActivityModel.deleteMany({}),
    InvitationModel.deleteMany({}),
    CompanyModel.deleteMany({}),
    CompanyMemberModel.deleteMany({}),
  ]);
  for (const name of ["clientcompanies", "teams", "vendormembers", "logincodes"]) {
    try {
      await db.collection(name).deleteMany({});
    } catch {
      /* collection may not exist */
    }
  }
  const keepEmails = KEEP_USERS.map((u) => u.email);
  const delUsers = await UserModel.deleteMany({ email: { $nin: keepEmails } });
  console.log(`Removed ${delUsers.deletedCount ?? 0} test user(s).`);

  // 2. Users + IT-Geeks delivering company --------------------------------
  const userIdByEmail = new Map<string, Id>();
  for (const u of KEEP_USERS) userIdByEmail.set(u.email, await ensureUser(u.email, u.name, u.role));

  const deliveringCompanyId = oid();
  await CompanyModel.collection.insertOne({
    _id: deliveringCompanyId,
    name: DELIVERY_COMPANY,
    claimed: true,
    createdByUserId: userIdByEmail.get("vendor@eos.local")!,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const deliveryMembers: { _id: Id; email: string; name: string }[] = [];
  const deliveryMemberDocs: Record<string, unknown>[] = [];
  for (const u of KEEP_USERS) {
    const _id = oid();
    deliveryMemberDocs.push({
      _id,
      companyId: deliveringCompanyId,
      email: u.email,
      name: u.name,
      role: "owner",
      userId: userIdByEmail.get(u.email)!,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deliveryMembers.push({ _id, email: u.email, name: u.name });
  }
  for (const t of DELIVERY_TEAMMATES) {
    const _id = oid();
    deliveryMemberDocs.push({
      _id,
      companyId: deliveringCompanyId,
      email: t.email,
      name: t.name,
      role: t.role,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    deliveryMembers.push({ _id, email: t.email, name: t.name });
  }
  await CompanyMemberModel.collection.insertMany(deliveryMemberDocs);
  // teammates only (skip the 3 owner accounts) are the pool for staffing/assignees
  const staffPool = deliveryMembers.slice(KEEP_USERS.length);

  const vendorUserId = userIdByEmail.get("vendor@eos.local")!;
  const vendorTeamEmbedded = [
    {
      userId: vendorUserId,
      email: "vendor@eos.local",
      name: "IT-Geeks Owner",
      role: "owner" as const,
      invitePending: false,
    },
  ];

  // 3. Per-row import -----------------------------------------------------
  const companyByName = new Map<string, Id>();
  const projectDocs: Record<string, unknown>[] = [];
  const milestoneDocs: Record<string, unknown>[] = [];
  const activityDocs: Record<string, unknown>[] = [];
  const invitationDocs: Record<string, unknown>[] = [];
  const companyDocs: Record<string, unknown>[] = [];
  const companyMemberDocs: Record<string, unknown>[] = [];
  let confidentialCount = 0;

  // Ongoing projects are re-anchored to "now" so the dashboard rating-trend
  // chart has data in every window. Each ongoing project's most recent review
  // lands this many days back — front-loaded so "Last week" is well populated,
  // the rest fanned out across the quarter/year. One entry per ongoing CSV row
  // (there are 14); it wraps if that ever changes.
  const RECENT_REVIEW_OFFSETS_DAYS = [1, 2, 3, 4, 5, 6, 9, 13, 20, 31, 47, 66, 88, 120];
  let ongoingSeq = 0;

  for (const r of dataRows) {
    const csvId = r[idx.id].trim();
    const rand = mulberry32(Number(csvId) || 1);
    const title = decodeEntities(r[idx.name].trim());
    // "Confidential" is about the CLIENT COMPANY. An "Anonymous" clientName only
    // means the named contact person is withheld — the company can still be real.
    const confidential =
      r[idx.isClientConfidential]?.trim().toLowerCase() === "t" ||
      !r[idx.clientCompanyName]?.trim() ||
      r[idx.clientCompanyName]?.trim().toLowerCase() === "confidential";

    const designationFull = decodeEntities(r[idx.clientDesignation]?.trim() || "");
    const designationParts = designationFull.split(",");
    const roleTitle = designationParts[0]?.trim() || "Client Contact";
    const designationTail = designationParts.slice(1).join(",").trim();

    let receivingName: string;
    if (!confidential) {
      receivingName = decodeEntities(r[idx.clientCompanyName].trim());
    } else {
      const forMatch = title.match(/\bfor\s+(.+?)\s*$/i);
      receivingName =
        (forMatch && forMatch[1].replace(/\s*\([^)]*\)\s*$/, "").trim()) ||
        designationTail ||
        `Confidential Client ${++confidentialCount}`;
    }
    receivingName = receivingName.replace(/\s+/g, " ").trim();

    const contactName = confidential
      ? "Anonymous"
      : decodeEntities(r[idx.clientName].trim()) || "Anonymous";
    const domain = `${slugForDomain(receivingName)}.example`;
    const contactEmail =
      contactName === "Anonymous"
        ? `contact@${domain}`
        : `${contactName.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@${domain}`;

    // receiving company (deduped by name)
    let receivingCompanyId = companyByName.get(receivingName.toLowerCase());
    if (!receivingCompanyId) {
      receivingCompanyId = oid();
      companyByName.set(receivingName.toLowerCase(), receivingCompanyId);
      companyDocs.push({
        _id: receivingCompanyId,
        name: receivingName,
        claimed: false,
        createdByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      companyMemberDocs.push({
        _id: oid(),
        companyId: receivingCompanyId,
        email: contactEmail,
        name: contactName === "Anonymous" ? null : contactName,
        role: "owner",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const completed = r[idx.completionStatus]?.trim().toLowerCase() === "completed";
    const start = parseDate(r[idx.startDate]) ?? new Date("2023-01-01T00:00:00.000Z");
    const end = parseDate(r[idx.endDate]);
    const rowCreatedAt = parseDate(r[idx.createdAt]) ?? new Date();
    const rowUpdatedAt = parseDate(r[idx.updatedAt]) ?? rowCreatedAt;
    const fit = Number.parseFloat(r[idx.fitScore]) || 85;
    const teamSize = Number.parseInt(r[idx.teamSize], 10);
    const projectUrl = r[idx.projectUrl]?.trim() || null;

    const projectId = oid();

    // ---- milestones ----------------------------------------------------
    const deliverables = liItems(r[idx.deliverables] || "");
    const fallbackTitles = [
      "Discovery & requirements",
      "Design & build",
      "Integration & configuration",
      "QA & fixes",
      "Launch & hand-over",
    ];
    const titles = (deliverables.length >= 3 ? deliverables : [...deliverables, ...fallbackTitles])
      .slice(0, clamp(deliverables.length || 4, 3, 6))
      .map((t) => (t.length > 90 ? `${t.slice(0, 87)}…` : t));
    const n = titles.length;

    // status split
    const reviewedUpto = completed ? n : Math.max(1, n - 2);
    const sentIdx = completed ? -1 : reviewedUpto; // one "with client" after the reviewed run

    const DAY = 864e5;
    // Per-milestone due dates + (for reviewed ones) reviewedAt. Completed
    // projects keep the CSV's historical span; ongoing projects are re-anchored
    // so their reviewed run ends a few days before "now".
    const dueAt: number[] = [];
    const reviewedAtByIdx: (number | null)[] = [];
    if (completed) {
      const horizon = end ?? new Date(Math.min(Date.now(), start.getTime() + 200 * DAY));
      const span = Math.max(horizon.getTime() - start.getTime(), n * 7 * DAY);
      for (let i = 0; i < n; i++) {
        const due = start.getTime() + (span * (i + 1)) / n;
        dueAt.push(due);
        reviewedAtByIdx.push(due + (2 + Math.floor(rand() * 6)) * DAY);
      }
    } else {
      const k = ongoingSeq++;
      const lastReviewOffset =
        RECENT_REVIEW_OFFSETS_DAYS[k % RECENT_REVIEW_OFFSETS_DAYS.length];
      const stepDays = 17 + (k % 4) * 7; // gap between consecutive reviews
      const now = Date.now();
      // reviewed run: newest at `-lastReviewOffset`, older ones stepping back
      for (let j = 0; j < reviewedUpto; j++) {
        const reviewed = now - (lastReviewOffset + (reviewedUpto - 1 - j) * stepDays) * DAY;
        reviewedAtByIdx.push(reviewed);
        dueAt.push(reviewed - (2 + Math.floor(rand() * 5)) * DAY);
      }
      const lastReviewedDue = dueAt[dueAt.length - 1] ?? now - 30 * DAY;

      // A slice of the ongoing projects (those whose review run ended long
      // enough ago to leave room) carry a lapsed deadline, so the dashboard
      // "Overdue milestones" / "Due soon" cards aren't stuck at zero:
      //   k 6–8  → the sent milestone AND its next draft are past due
      //   k 9–13 → the sent milestone is past due, the next draft is due soon
      const flag: "future" | "overdueBoth" | "overdueSent" =
        k >= 6 && lastReviewedDue < now - 12 * DAY
          ? k <= 8
            ? "overdueBoth"
            : "overdueSent"
          : "future";

      // the "with client" milestone: normally sent a few days ago and due
      // shortly; when flagged, its deadline has already lapsed.
      if (sentIdx >= 0 && sentIdx < n) {
        const sentDue =
          flag === "future"
            ? now + (3 + Math.floor(rand() * 6)) * DAY
            : now - (4 + (k % 7)) * DAY;
        dueAt.push(sentDue);
        reviewedAtByIdx.push(null);
      }
      // remaining drafts: near-future, unless this project is flagged
      for (let i = dueAt.length; i < n; i++) {
        const draftDue =
          flag === "overdueBoth"
            ? now - (1 + (k % 4)) * DAY // already overdue
            : flag === "overdueSent"
              ? now + (2 + (k % 5)) * DAY // inside the 7-day "due soon" window
              : now + (12 + (i - sentIdx) * 16 + Math.floor(rand() * 8)) * DAY;
        dueAt.push(draftDue);
        reviewedAtByIdx.push(null);
      }
    }

    let reviewedCount = 0;
    const projectActivityBase: Record<string, unknown>[] = [];

    for (let i = 0; i < n; i++) {
      const msId = oid();
      const due = new Date(dueAt[i]);
      const prevDue =
        i > 0 ? dueAt[i - 1] : completed ? start.getTime() : due.getTime() - 24 * DAY;
      const msStart = new Date(Math.min(prevDue, due.getTime() - DAY));
      let status: "draft" | "sent" | "reviewed" = "draft";
      if (i < reviewedUpto) status = "reviewed";
      else if (i === sentIdx) status = "sent";

      const assignees = [...staffPool]
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
          status === "reviewed" && reviewedAtByIdx[i] != null
            ? (reviewedAtByIdx[i] as number) - (3 + Math.floor(rand() * 5)) * DAY
            : Math.min(due.getTime() - 3 * DAY, Date.now() - 2 * DAY);
        const sentAt = new Date(anchor);
        base.sentAt = sentAt;
        activityDocs.push({
          _id: oid(),
          projectId,
          milestoneId: msId,
          type: "FEEDBACK_REQUESTED",
          message: `Sent "${titles[i]}" for client review`,
          createdAt: sentAt,
        });
      }

      if (status === "reviewed") {
        reviewedCount++;
        const { ratings, avg } = balancedRatings(rand, fit);
        const tier = avg >= 4 ? "high" : avg >= 3 ? "mid" : "low";
        const tierComments = COMMENTS_BY_TIER[tier];
        const reviewedAt = new Date(reviewedAtByIdx[i] ?? due.getTime() + 3 * DAY);
        base.ratings = ratings;
        base.rating = avg;
        base.comment = tierComments[Math.floor(rand() * tierComments.length)];
        base.reviewedAt = reviewedAt;
        base.ratingSubmittedAt = reviewedAt;
        base.reviewedByName = contactName;
        base.reviewedByEmail = contactEmail;
        base.updatedAt = reviewedAt;
        activityDocs.push({
          _id: oid(),
          projectId,
          milestoneId: msId,
          type: "FEEDBACK_RECEIVED",
          message: `Client reviewed "${titles[i]}" (${avg.toFixed(1)}/5)`,
          createdAt: reviewedAt,
        });
      }

      milestoneDocs.push(base);
    }

    // ---- project score fields ----------------------------------------
    const reviewedRatings = milestoneDocs
      .filter((m) => (m.projectId as Id).equals(projectId) && m.status === "reviewed")
      .map((m) => m.rating as number);
    const liveScore =
      reviewedRatings.length > 0
        ? Math.round((reviewedRatings.reduce((a, b) => a + b, 0) / reviewedRatings.length) * 100) / 100
        : null;

    const assignedMemberIds = [...staffPool]
      .sort(() => rand() - 0.5)
      .slice(0, 2 + Math.floor(rand() * 2))
      .map((m) => m._id);

    const completionRequestedAt = completed && end ? new Date(end.getTime() - 4 * 864e5) : null;

    projectDocs.push({
      _id: projectId,
      name: title,
      clientCompanyName: receivingName,
      clientCompanyId: null,
      deliveringCompanyId,
      receivingCompanyId,
      clientContactName: contactName === "Anonymous" ? null : contactName,
      clientEmail: contactEmail,
      services: "Web & E-commerce Development",
      description: stripTags(r[idx.summary] || ""),
      startDate: start,
      expectedCompletionDate: end,
      actualCompletionDate: completed ? end : null,
      status: completed ? "COMPLETED" : "ACTIVE",
      teamSize: Number.isFinite(teamSize) ? teamSize : null,
      engagementModel: ENGAGEMENT_BY_CODE[r[idx.engagementModel]?.trim()] ?? null,
      internalRef: `ITG-${csvId}`,
      projectUrl,
      visibility: "PRIVATE",
      adminStatus: "published",
      executionStatus: completed ? "completed" : "ongoing",
      minReviewThreshold: minReviewThreshold(n),
      completionRequestedAt,
      completionConfirmedByClient: completed,
      completionForcedByAdmin: false,
      liveScore,
      reviewedMilestoneCount: reviewedCount,
      finalScore: completed ? liveScore : null,
      vendorTeam: vendorTeamEmbedded,
      clientContacts: [
        {
          userId: null,
          email: contactEmail,
          name: contactName === "Anonymous" ? null : contactName,
          designation: roleTitle,
          role: "primary",
          invitePending: true,
        },
      ],
      assignedMemberIds,
      receivingMemberIds: [],
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
      createdAt: rowCreatedAt,
      updatedAt: rowUpdatedAt,
    });

    activityDocs.push({
      _id: oid(),
      projectId,
      milestoneId: null,
      type: "PROJECT_CREATED",
      message: `Project "${title}" created for ${receivingName}`,
      createdAt: start,
    });
    if (completed && end) {
      activityDocs.push({
        _id: oid(),
        projectId,
        milestoneId: null,
        type: "PROJECT_COMPLETED",
        message: `Client confirmed completion — final score locked${
          liveScore != null ? ` at ${liveScore.toFixed(1)}` : " (unrated)"
        }`,
        createdAt: end,
      });
    }

    invitationDocs.push({
      _id: oid(),
      email: contactEmail,
      projectId,
      kind: "client_contact",
      proposedRole: "primary",
      designation: roleTitle,
      invitedByUserId: vendorUserId,
      status: "pending",
      createdAt: start,
      updatedAt: start,
    });
    void projectActivityBase;
  }

  // 4. Insert -----------------------------------------------------------
  console.log(
    `Inserting ${companyDocs.length} client companies, ${projectDocs.length} projects, ` +
      `${milestoneDocs.length} milestones, ${activityDocs.length} activities …`,
  );
  // Raw driver inserts: the docs are already fully shaped (explicit _id, ObjectId
  // refs, Date fields, every schema field set) and we want the CSV-derived
  // createdAt/updatedAt kept verbatim rather than stamped with "now".
  if (companyDocs.length) await CompanyModel.collection.insertMany(companyDocs);
  if (companyMemberDocs.length) await CompanyMemberModel.collection.insertMany(companyMemberDocs);
  await ProjectModel.collection.insertMany(projectDocs);
  await MilestoneModel.collection.insertMany(milestoneDocs);
  await ActivityModel.collection.insertMany(activityDocs);
  await InvitationModel.collection.insertMany(invitationDocs);

  const completedN = projectDocs.filter((p) => p.executionStatus === "completed").length;
  console.log("\nDone.");
  console.log(`  delivering company : ${DELIVERY_COMPANY} (${deliveryMemberDocs.length} people)`);
  console.log(`  client companies   : ${companyDocs.length}`);
  console.log(`  projects           : ${projectDocs.length} (${completedN} completed, ${projectDocs.length - completedN} ongoing)`);
  console.log(`  milestones         : ${milestoneDocs.length}`);
  console.log("  sign in as         : admin@eos.local, vendor@eos.local, shopnil16@gmail.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
