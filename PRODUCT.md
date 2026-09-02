# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Vendor delivery teams (primary).** People at a software outsourcing company running real
client engagements — company owners/admins who create projects and control publishing, and
project managers / team members assigned to specific projects who create milestones, move
them through delivery, and send them for review. They work mostly from a desktop workspace.

**Client reviewers.** Any contact at the receiving company. They arrive from an emailed
one-time code, often on a phone, to read a milestone's deliverables and submit a structured
review. They are not full workspace users and should never see unrelated projects.

**EOS admins.** Enosis platform staff who approve projects into the public portfolio,
investigate suspicious feedback, and force-complete stalled engagements.

Audience for the current build is mixed: it must demo convincingly to Enosis stakeholders
now, and is on a path to real daily use by vendor teams, so operational depth matters
alongside the walkthrough.

## Product Purpose

EOS Performance Monitoring extends Enosis Outsourcing's existing public project-portfolio
product with a **private delivery and performance-monitoring workflow**. A vendor manages an
actual client engagement as a private project, breaks it into milestones, collects a
structured client review after each one, and watches a running delivery score and client-
health signal on a dashboard. When (and only if) it makes sense, the vendor converts the
private project into a public portfolio project, carrying forward eligible verified
performance data.

Success: a vendor can run a client engagement end to end without ever publishing it; client
reviews are trustworthy first-party data the vendor cannot alter; and by the time a project
goes public it already carries a real history of verified delivery performance.

## Positioning

**"Manage privately. Measure continuously. Publish selectively."** Existing portfolio tools
capture a single retrospective endorsement per project. This captures continuous, per-
milestone, reviewer-attributed delivery performance from live engagements — verified first-
party data that accrues whether or not the project is ever made public. Release/milestone
evaluation (private, continuous, delivery-focused) and the public project endorsement
(public, one-time, credibility-focused) are deliberately kept as separate trust signals.

## Operating Context

- **One unified workspace.** Delivering and receiving companies are the same `Company` model
  with no type; a company delivers or receives per project. Everyone signs in to the same
  `/dashboard`; project, People, and dashboard pages are single pages shaped per viewer by
  `project.myAccess` (`deliveryRole`, `reviewRole`, `assignedDelivery`, `assignedReview`).
- **Auth on every page** except `/login` and `/invite/[code]`. No passwords — sign-in is an
  emailed one-time code, also printed to the server console in this prototype.
- **Milestone lifecycle:** `draft → sent → reviewed`. Only one milestone may be `sent` at a
  time; a `sent` milestone is locked for edits. Milestones carry start/due dates (overdue and
  due-soon flags key off `dueDate`), vendor assignees snapshotted from the project team, an
  optional URL, and file attachments (GridFS, 15 MB/file, either side uploads).
- **The review** is five 1–5 dimensions from the Enosis Client Feedback Form — quality of
  deliverables, timeliness, understanding of requirements, planning & management,
  communication. `milestone.rating` is their average and is the single number every scoring
  path uses. Any client contact can submit it; the reviewer's identity is stamped on the
  milestone.
- **Two-sided completion** then an optional **capstone endorsement** (frozen final score,
  promoter/neutral/detractor tier), then optional **publish** to a public project page that
  an EOS admin approves.
- **Configurable thresholds** (`src/lib/constants.ts`): client-health bands (Happy ≥4.0 /
  Needs Attention ≥3.0 / At Risk below), satisfaction-rate threshold, at-risk trigger,
  due-soon window, public-score minimum-reviews rule. These are meant to be tuned without
  redesigning the feature.

## Capabilities and Constraints

- **Project types:** *Whole* (exactly one milestone) or *Milestone* (many). Set at creation
  and reflected throughout.
- **Roles / permissions** derive from `project.myAccess`: a company owner/admin sees every
  project their company is on; a plain member sees only projects they're individually
  assigned to. `canManageProject` = delivery owner/admin; milestone CRUD = any delivery
  member; `canRateMilestone` = any review member; confirm-completion and capstone submit =
  review owner/admin.
- **People assignment** is individual, Jira-style — no Teams. Delivery and review people are
  each a searchable id list (`assignedMemberIds` / `receivingMemberIds`) plus each company's
  owners/admins, recomputed live on every read. The company's own people directory lives at
  `/team`.
- **Rating integrity:** a vendor cannot submit, edit, or delete a client's review or written
  feedback; can resend a request; can see pending vs. complete. Client review data stays
  separate from vendor-only internal notes. `User.role` is just `admin | member`.
- **Privacy is load-bearing:** private project and milestone data must never appear on public
  company profiles, discovery/search, sitemaps, structured data, or any unauthenticated URL.
  Publishing never makes all private data public — only explicitly approved, consented
  performance signals.
- **Architecture:** Next.js 16 App Router + TypeScript + Tailwind 4 web app; a separate
  NestJS API (`./api`, port 4000) owns MongoDB and auth. Server Components / Actions are thin
  HTTP clients — no direct DB access. `AUTH_SECRET` shared both sides; session JWT forwarded
  as a Bearer token.
- **Visual direction is open.** There is no binding EOS/Enosis design system to extend; the
  current slate/Tailwind styling is throwaway prototype skin. PRD Appendix A's "stay
  consistent with the existing EOS product" is not a constraint on this build. New visual
  work is welcome and expected.
- **Notifications and email delivery** are specced (PRD §23) but not built — the prototype
  surfaces activity in-app only and prints sign-in codes to the console.

## Brand Commitments

- **Enosis Outsourcing / EOS** is the real parent product and name; "EOS Performance
  Monitoring" is this feature. Keep the EOS name.
- **Placeholders, not brand truth:** the vendor display name `"Waverley Software"`
  (`VENDOR_NAME` in `src/lib/constants.ts`) and all seed companies/people are demo data. No
  real logo, color, or typography has been made binding.
- **Product principle as tagline:** "Manage privately. Measure continuously. Publish
  selectively."

## Evidence on Hand

- **`PRD.md`** — the full v1.0 feature PRD (private projects, releases→milestones, dashboard,
  publication, metric definitions, acceptance criteria, and Appendix A screen inventory of
  the existing EOS public product). Written against the older `Release`/`FeedbackRequest`
  model; `AGENTS.md` records where the implementation has since diverged.
- **`AGENTS.md`** — current source of truth for the divergences (milestones, company
  unification, dropped Teams, NestJS split). Overrides older docs where they conflict.
- **`private_docs/plan1.md`** — the phased milestones design and `spec §N` references cited
  throughout `src/lib`.
- **`npm run db:seed`** — a demo dataset: a published Whole project (Corporate Rebrand
  Rollout / Gravity77), an ongoing Milestone project below the public review threshold
  (E-commerce Platform / NorthPeak Logistics), and a completed Milestone project with a
  locked 5.0 score and capstone endorsement (Marketing Site Redesign / BrightWave Media).
- **`npm test`** — pure-logic unit tests for scoring, permissions, and milestone/flag guards.
- **No real customer data, testimonials, benchmarks, pricing, or deployment claims exist.**
  Future work must not fabricate them.

## Product Principles

1. **Private by default, public by deliberate choice.** Every surface must make it obvious
   what is internal and what would become public; publication is always an explicit, consented
   step, never a side effect.
2. **Client reviews are evidence, not marketing.** Reviewer identity, per-dimension scores,
   and timestamps are recorded and immutable to the vendor. The design should make that
   integrity legible to both sides.
3. **One workspace, shaped by access.** Delivery and review sides use the same pages; what a
   person can see and do comes from `project.myAccess`, not from separate apps.
4. **The dashboard answers "which client needs attention?"** Performance monitoring is the
   point — health signals, trends, and alerts should lead, with drill-down to the specific
   project or milestone.
5. **Low-friction reviewing.** A client reviewer arrives from an email link, often on a
   phone, with no account — the review flow must stand on its own on a small screen.

## Accessibility & Inclusion

No formal standard has been set. Given external client reviewers on unknown devices, treat
WCAG 2.1 AA as the working bar for the review flow and sign-in: real form labels, visible
focus, adequate contrast, and keyboard operability (the current CSS-only star rating and
`<details>` menus need checking against this).
