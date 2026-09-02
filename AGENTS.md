# Project context

This is the `eos-pmd` milestones-feature prototype. Two things that differ from older docs:

- **Auth is required.** Every page outside `/login` and `/invite/[code]` runs behind a JWT session
  cookie (`src/lib/auth.ts`, `middleware.ts`). Server components call `requireUser(role?)`; server
  actions guard with `src/lib/permissions.ts`. No passwords — sign-in is an emailed one-time code shown
  on screen and in the server console.
- **`Release` / `FeedbackRequest` are gone.** Projects own a `Milestone` collection (one for a Whole
  project, many for a Milestone project). A milestone goes `draft → sent → reviewed`; the client's
  Primary Contact gives it one 1–5 rating. See `private_docs/plan1.md` for the phased design and the
  `spec §N` comments in `src/lib` for individual rules.

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
