# EOS Performance Monitoring — Milestones MVP

A working prototype of the milestone-based delivery-performance workflow described in
[`private_docs/MILESTONES-SPEC.md`](./private_docs/MILESTONES-SPEC.md), implemented in phases per
[`private_docs/plan1.md`](./private_docs/plan1.md):

sign in → private project (Whole or Milestone) → admin approval → milestones sent for client review →
per-milestone client rating → running delivery score → two-sided completion → optional capstone endorsement →
optional publish to a public project page.

## Stack

Next.js 16 (App Router) + TypeScript + Mongoose 8 / MongoDB + Tailwind CSS 4. Server Components for reads,
Server Actions for every mutation — no separate REST/API layer. Sessions are a signed JWT (`jose`) in an
httpOnly cookie, enforced by [`middleware.ts`](./middleware.ts) and `getCurrentUser()` / `requireUser()` in
[`src/lib/auth.ts`](./src/lib/auth.ts).

## Running it

```bash
npm install
cp .env.example .env   # set MONGODB_URI and AUTH_SECRET
npm run db:seed        # resets the database to the demo dataset below
npm run dev            # http://localhost:3000
```

`npm run build` runs a production build. `npm test` runs the unit tests (pure logic only —
`scoring`, `permissions`, and the milestone/flag guards).

## Authentication

There is no password and no email delivery. Request a one-time code at `/login`; it is printed to the
screen and the server console. One account per verified email. Roles: `vendor` (workspace under
`src/app/(vendor)`), `buyer` (client workspace under `src/app/(client)`), `admin` (`src/app/admin`).

`npm run db:seed` leaves sign-in accounts intact and ensures these:

| Email | Role | Sees |
|---|---|---|
| `vendor@eos.local` | vendor | all three demo projects (founding owner) |
| `member@eos.local` | vendor | the same projects as a team member |
| `admin@eos.local` | admin | the approval queue and completion-timeout list |
| `dana.okafor@northpeak.example` | buyer | the E-commerce project as primary contact |
| `wes.hart@northpeak.example` | buyer | the same project as a view-only collaborator |
| `priya.menon@brightwave.example` | buyer | the completed Marketing Site project |

## Demo data

Run `npm run db:seed` any time to reset to this state:

- **Corporate Rebrand Rollout** (Gravity77) — a **Whole** project: one milestone, reviewed 5/5,
  published to the public portfolio.
- **E-commerce Platform Development** (NorthPeak Logistics) — a **Milestone** project, ongoing and
  **below the public review threshold** (1 of 5 milestones reviewed). Has a milestone overdue in draft,
  one stuck with the client, a vendor team of two, an accepted primary contact and collaborator, and one
  pending collaborator invite (`/invite/<code>` on the people page).
- **Marketing Site Redesign** (BrightWave Media) — a **Milestone** project, **completed** with a locked
  final score of 5.0 and a submitted **capstone endorsement** that renders on the public preview.

## Milestone model

`Release` and per-release `FeedbackRequest` are retired. Every project owns a `Milestone` collection —
exactly one for a Whole project, one or more for a Milestone project. A milestone moves
`draft → sent → reviewed`; only one may be `sent` at a time; a `sent` milestone is locked for edits. The
client's Primary Contact gives each milestone a single 1–5 "Quality of Deliverables" rating; the project's
running average is recomputed on every review and becomes public once the review threshold is met. See the
inline `spec §N` comments in [`src/lib`](./src/lib) for where each rule lives.

## Migrations

One-off scripts under [`scripts/migrations/`](./scripts/migrations), run in numeric order with
`npm run migrate:00N`. Each is idempotent. There is no migration framework.
