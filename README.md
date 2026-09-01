# EOS Performance Monitoring & Release-Based Client Feedback — MVP

A working prototype of the workflow described in [`PRD.md`](./PRD.md) §31 (MVP Scope):
private project → release → client feedback request → client evaluation (no login) →
Performance Monitoring Dashboard → optional publish to a public project page.

## Stack

Next.js 16 (App Router) + TypeScript + Prisma 7 + SQLite (`better-sqlite3` driver
adapter) + Tailwind CSS 4. Server Components for reads, Server Actions for every
mutation — no separate REST/API layer.

## Running it

```bash
npm install
npm run db:seed   # resets dev.db to a demo dataset (4 projects, mixed statuses)
npm run dev        # http://localhost:3000
```

`npm run build` runs a production build; `npx prisma studio` opens a DB browser.

## What's in the demo data

Run `npm run db:seed` any time to reset to this state:

- **E-commerce Platform Development** (Gravity77 Pty Ltd) — 5 releases, already
  **published**. Open `/feedback/demo-pending-feedback` to submit a live client
  evaluation for its release awaiting feedback and watch the dashboard update.
- **Internal Tools Revamp** (NorthPeak Logistics) — declining ratings, one
  overdue release. Drives the At-Risk / declining-satisfaction alerts.
- **Marketing Site Redesign** (BrightWave Media) — completed, consistently
  5-star history.
- **New Client Onboarding Portal** (Delta Freight Co) — no releases yet, to
  show the empty states (PRD §29).

## Scope notes (read alongside PRD.md)

This is a **single-vendor prototype with no authentication** — there's no
company/user/role model, just the workflow itself. Everything under
[`src/app/(vendor)`](./src/app/(vendor)) is the vendor-facing app (dashboard,
projects, releases); [`src/app/feedback`](./src/app/feedback) is the
client-facing, unauthenticated evaluation flow, deliberately outside the
vendor nav shell.

"Sending" a feedback request doesn't send email — there's no SMTP configured,
so the release page shows the secure `/feedback/[token]` link directly for you
to copy, which stands in for the email invitation in PRD §9.

Publishing (PRD §18–21) is implemented as a visibility flag plus a handful of
extra `public*` fields on `Project`, previewed at `/projects/[id]/public-preview`
in the layout described in `PRD.md` Appendix A.2. It does not touch a real
public directory, Explore Projects, PCS scoring, or the existing Client
Endorsement feature — those belong to the existing EOS product this feature
extends, which this prototype doesn't have access to.

See inline `PRD §N` comments throughout `prisma/schema.prisma` and
`src/lib/*.ts` for where each requirement is implemented.
