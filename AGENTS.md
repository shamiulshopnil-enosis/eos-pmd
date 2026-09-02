# Project context

This is the `eos-pmd` milestones-feature prototype. Two things that differ from older docs:

- **Auth is required.** Every page outside `/login` and `/invite/[code]` runs behind a JWT session
  cookie (`src/lib/auth.ts`, `middleware.ts`). Server components call `requireUser(role?)`; server
  actions guard with `src/lib/permissions.ts`. No passwords — sign-in is an emailed one-time code shown
  on screen and in the server console.
- **`Release` / `FeedbackRequest` are gone.** Projects own a `Milestone` collection (one for a Whole
  project, many for a Milestone project). A milestone goes `draft → sent → reviewed`; **any** client
  contact (not just the Primary) submits the review, and the reviewer is stamped on
  `reviewedByUserId/Name/Email`. The review is **five 1–5 dimensions** (`milestone.ratings`:
  deliverables, timeliness, understanding, planning, communication — from the Enosis Client Feedback
  Form, `MILESTONE_REVIEW_DIMENSIONS` in `src/lib/constants.ts`); `milestone.rating` is their average
  and still the single number every scoring path uses. Migration `npm run migrate:006` backfills
  pre-existing reviews. Milestones also carry `assignees[]` (vendor teammates, snapshotted
  from the project's vendor team), an optional `url`, and `attachments[]` — file bytes live in the
  `milestone_files` GridFS bucket; either side uploads via `POST /milestones/:id/attachments`
  (multipart, 15 MB/file), and the browser downloads through the Next route
  `/files/milestones/[milestoneId]/[attachmentId]` which proxies the API with the session token. See
  `private_docs/plan1.md` for the phased design and the `spec §N` comments in `src/lib`.

- **Team Management + Client Company directory.** A vendor keeps a reusable people directory
  (`VendorMember`, linked to a `User` on first sign-in with that email) grouped into `Team`s, both
  managed at `/team`. Projects reference `assignedTeamIds` / `assignedMemberIds`; the effective
  `project.vendorTeam` is recomputed live from them on every read in `projects.service` (grandfathered
  embedded `vendorTeam` rows are merged in, stored rows win). Client companies are a global directory
  (`ClientCompany`, `/client-companies`); creating a project picks one (or adds it inline) and its
  contact becomes the primary client contact. Migration: `npm run migrate:005` backfills companies
  from existing projects.

Run `npm test` for the pure-logic unit tests; `npm run db:seed` for a demo database.

- **Data + auth now live in a NestJS backend (`./api`).** The app no longer touches
  MongoDB directly. `src/lib/data.ts` and `src/lib/actions.ts` are thin HTTP clients
  (`src/lib/api-client.ts`) against the API under `http://localhost:4000/api`;
  `src/lib/auth.ts` keeps only the `eos_session` cookie and local JWT verification.
  Start the API (`cd api && npm run dev`) before `npm run dev`. `AUTH_SECRET` must match
  on both sides; the app forwards the session JWT as a Bearer token. See `api/README.md`.
  `src/lib/models.ts` / `src/lib/mongoose.ts` remain only for the offline `scripts/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
