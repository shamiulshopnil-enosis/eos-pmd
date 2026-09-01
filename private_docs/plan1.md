# Milestones Feature - Phased Implementation Plan (plan1)

Source spec: `MILESTONES-SPEC.md` (Draft).
Target codebase: this repo (`eos-pmd`), the single-vendor MVP prototype.
Stack in play: Next.js 16 App Router, Server Actions, MongoDB via Mongoose, no auth today.

This plan adapts a spec written for the full EOS platform onto a prototype that is missing most of the
platform primitives the spec assumes (accounts, roles, admin approval, PCS, adaptive attribute pools).
Per the decisions taken before writing this plan:

- The account / one-time-code sign-in dependency (spec section 2) is built here as **Phase 0**.
- PCS, the EOS-2508 attribute pools, and the admin approval lifecycle are built as **minimal local stand-ins**,
  not stubs and not assumed-external.

---

## 1. How the spec maps onto what exists today

| Spec concept | Today in `eos-pmd` | Plan |
|---|---|---|
| Project | `Project` model, vendor-only pages under `/(vendor)` | Extend in place (Phase 1) |
| Milestone | `Release` model + separate `FeedbackRequest` per release | `Release` is reshaped into `Milestone`; `FeedbackRequest` is retired (Phase 2) |
| One client review at project end ("Get Endorsed") | Token link `/feedback/[token]` + 7-dimension `submitEvaluation` | Retired. Replaced by per-milestone single rating for all project types (Phase 2/4) |
| Client account | none - client only ever hits an emailed token link | New `User` (Buyer) + email/one-time-code sign-in (Phase 0) |
| Vendor team, client contacts, roles | single hardcoded vendor `VENDOR_NAME`, no per-project people | `VendorTeamMember`, `ClientContact`, per-project permission helpers (Phase 3) |
| PMD (shared project dashboard) | vendor-only `/(vendor)/projects/[id]` | New shared route readable by both sides (Phase 4) |
| Admin approval lifecycle (`adminStatus`) | `Project.visibility` PUBLIC/PRIVATE only | Add `adminStatus` enum + minimal `/admin` approve/reject (Phase 1) |
| `showInPublic` | `Project.visibility` | Keep `visibility` as the mapping, no rename needed |
| Running score / PCS | `derived.ts` computes averages from `FeedbackRequest.overallSatisfaction` | New score source = milestone average; PCS stand-in module (Phase 5) |
| Capstone endorsement + attribute pools (EOS-2508) | none | `CapstoneEndorsement` + hardcoded tiered attribute pool (Phase 7) |
| 7-day endorsement link expiry | none as a named constant | Introduce `COMPLETION_TIMEOUT_DAYS = 7` once (Phase 6) |

---

## 2. Decisions and assumptions baked into this plan

1. **`Release` becomes `Milestone`.** There is no value in keeping both in a prototype, and the spec is explicit
   about one model / one code path (spec sections 3 and 10). Existing `Release` rows and their `FeedbackRequest`
   ratings are migrated into `Milestone` rows.
2. **The multi-dimension endorsement form is fully retired**, including for Whole Projects. Spec 6.4 + 10 say the
   Whole Project's single milestone uses the same lightweight single rating as any other milestone. The seven
   rating dimensions on today's `FeedbackRequest` are dropped; only `qualityOfDeliverables` carries forward as the
   milestone `rating`.
3. **No email infrastructure.** Every "notify" / "invite" / "one-time code" is delivered in-app: an `Activity`
   entry plus, for auth and invites, the code shown on screen and logged to the server console. Real SMTP is a
   flagged TODO, out of scope for this plan.
4. **Sessions** are a signed JWT in an httpOnly cookie (`jose`), read by a `middleware.ts` route guard and a
   `getCurrentUser()` server helper. No password storage at any point.
5. **Rich text** milestone descriptions are stored as sanitized HTML (`sanitize-html` on write) and authored with
   a small toolbar over `contenteditable` supporting bold and unordered lists only. Rendered with the same
   sanitizer on read. This is the lightest option that meets spec 4.2 / 6.2. (Alternative: store Markdown. Called
   out again in Open Items.)
6. **TBD numbers** (spec section 11) are given working defaults, each behind a named constant in
   `src/lib/constants.ts` so a later decision is a one-line change:
   - `MIN_REVIEW_THRESHOLD`: `min(2, ceil(0.25 * totalMilestoneCount))` reviewed milestones.
   - `RATING_SELF_CORRECTION_HOURS`: `48`.
   - `COMPLETION_TIMEOUT_DAYS`: `7` (fixed by spec, still a named constant).
   - Capstone tiers: Promoter `>= 4.0`, Neutral `2.51 - 3.9`, Detractor `<= 2.5` (fixed by spec).
7. **Admin** is a `User` with `role: "admin"`. A single seeded admin account is enough for the prototype.
8. Each phase that changes the schema ships a one-off migration script under `scripts/migrations/` run manually
   with `tsx --env-file=.env`. There is no migration framework and this plan does not add one.
9. There is no test setup in the repo today. The plan adds Vitest and unit tests for the pure logic modules
   (scoring, thresholds, state-machine guards). UI and integration tests are out of scope.

---

## 3. Target data model (end state, after all phases)

Functional shape, not final schema. Embedded vs referenced follows current conventions: `Project` stays one
document; people and capstone are embedded arrays/subdocuments on `Project`; `Milestone` stays its own collection
keyed by `projectId` (mirrors how `Release` works today).

```
User {
  id
  email                unique, lowercased
  name
  role                 "buyer" | "vendor" | "admin"
  emailVerified        boolean
  createdAt
}

LoginCode {                      // transient, for email + one-time-code sign-in and invite acceptance
  id
  email
  codeHash
  purpose              "login" | "invite"
  expiresAt            now + 15 min
  consumedAt           date | null
}

Invitation {
  id
  email
  projectId
  kind                 "vendor_team" | "client_contact"
  proposedRole         "owner" | "member" | "primary" | "collaborator"
  designation          string | null      // client contacts only
  invitedByUserId
  status               "pending" | "accepted" | "revoked"
  createdAt
}

Project {
  ...all existing fields unchanged (name, clientCompanyName, clientEmail, services,
     description, dates, teamSize, engagementModel, internalRef, projectUrl,
     visibility, public* fields, publicPerformanceConsent, publishedAt, timestamps)

  status               ProjectStatus        // existing ACTIVE/ON_HOLD/... kept, still vendor-facing housekeeping
  projectType          "whole" | "milestone"
  adminStatus          "draft" | "pending_approval" | "published" | "rejected" | "edited" | "trashed"
  executionStatus      "ongoing" | "awaiting_completion" | "completed"
  minReviewThreshold   number               // snapshot of the rule result, recomputed as milestones change
  completionRequestedAt   date | null
  completionConfirmedByClient   boolean
  completionForcedByAdmin       boolean
  liveScore            number | null        // running avg of reviewed milestones, null until first review
  reviewedMilestoneCount  number
  finalScore           number | null        // set once, when executionStatus -> completed
  vendorTeam           VendorTeamMember[]
  clientContacts       ClientContact[]
  capstone             CapstoneEndorsement | null
}

Milestone {                                 // replaces Release
  id
  projectId
  title                string               // plain text
  description          string               // sanitized HTML (bold + <ul> only)
  targetDate           date | null
  status               "draft" | "sent" | "reviewed"
  rating               integer 1-5 | null   // "Quality of Deliverables"
  comment              string | null
  editRequestedByVendor   boolean           // once-per-milestone latch for vendor reconsideration
  ratingSubmittedAt    date | null          // start of the client self-correction window
  reviewedAt           date | null
  sentAt               date | null
  createdAt
}

VendorTeamMember {          // embedded on Project
  userId               id | null
  email                string               // present even after userId is set
  name                 string | null
  role                 "owner" | "member"
  invitePending        boolean
}

ClientContact {            // embedded on Project
  userId               id | null
  email                string
  name                 string | null
  designation          string
  role                 "primary" | "collaborator"
  invitePending        boolean
}

CapstoneEndorsement {     // embedded on Project
  requested            boolean
  submitted            boolean
  attributes           string[]   // max 5
  testimonial          string
  anonymous            boolean
  tier                 "promoter" | "neutral" | "detractor"   // frozen from finalScore at request time
  requestedAt          date | null
  submittedAt          date | null
}
```

Retired after migration: the `FeedbackRequest` model, its `token`/`remindersSent` fields, and the
`RATING_CATEGORIES` multi-dimension config.

---

## 4. Phases

Each phase lists: **Goal**, **Schema**, **Files**, **Migration**, **Rules implemented**, **Exit criteria**.
Phases are ordered by dependency. Section 5 shows what can run in parallel.

---

### Phase 0 - Identity and access foundation

Blocking dependency for everything client-facing (spec section 2 and 8). Vendor-side milestone work in Phases 1-2
does not need this and can start in parallel.

**Goal.** Real accounts. Email + one-time-code sign-in with no password. One account per verified email. A Buyer
home area ("My Projects") shell. An `/admin` area gated by role. An invitation record + accept flow reused by
both vendor-team and client-contact invites in Phase 3.

**Schema.**
- New models: `User`, `LoginCode`, `Invitation` (see section 3).
- Seed one `admin` user and one `vendor` user (replaces the hardcoded single vendor identity; `VENDOR_NAME`
  stays only as a display label).

**Files.**
- `src/lib/models.ts` - add `UserModel`, `LoginCodeModel`, `InvitationModel`.
- `src/lib/auth.ts` (new) - `createLoginCode(email, purpose)`, `verifyLoginCode(email, code)`, `issueSession(user)`,
  `getCurrentUser()`, `requireUser(role?)`. JWT via `jose`, httpOnly cookie.
- `middleware.ts` (new, repo root) - guard `/(vendor)`, `/(client)`, `/admin`; redirect unauthenticated to
  `/login`.
- `src/app/login/page.tsx` + `src/app/login/actions.ts` (new) - request code, enter code, redirect by role.
- `src/app/(client)/layout.tsx` + `src/app/(client)/my-projects/page.tsx` (new) - Buyer home shell listing
  projects where the user is a `ClientContact` (empty until Phase 3 wires contacts).
- `src/app/admin/layout.tsx` + `src/app/admin/page.tsx` (new) - shell, role-gated.
- `src/components/NavShell.tsx` - show current user + sign-out; the "single-vendor demo, no authentication"
  note comes out.
- `package.json` - add `jose`, `sanitize-html` (used Phase 2), `vitest` + `@vitest/ui` dev.
- `.env.example` / `.env` - add `AUTH_SECRET`.

**Migration.** `scripts/migrations/000_seed_users.ts` - create admin + vendor users; attach the existing
implicit vendor as `vendorTeam` owner on every existing project (email from a new `SEED_VENDOR_EMAIL`).

**Rules implemented.**
- One account per lowercased email; second invite to the same email resolves to the same `User`.
- Codes expire in 15 minutes, single-use (`consumedAt`).
- Newly created invited client accounts get `role: "buyer"` (spec 2, spec 10 - no new role type).

**Exit criteria.**
- A user can request a code, receive it (on screen + server log), sign in, and land on the right home area by
  role.
- `middleware.ts` blocks the vendor, client, and admin areas when signed out.
- `getCurrentUser()` works in server components and server actions.
- Existing vendor pages still load for the seeded vendor user.

---

### Phase 1 - Project type, execution status, admin lifecycle stand-in

**Goal.** Every project has a type and an execution status independent of admin approval. A minimal admin
approve/reject gate stands in front of public visibility (spec 4.1, 5.1, 5.2, 9, 10).

**Schema.** Add to `Project`: `projectType`, `adminStatus`, `executionStatus`, `minReviewThreshold`,
`completionRequestedAt`, `completionConfirmedByClient`, `completionForcedByAdmin`, `liveScore`,
`reviewedMilestoneCount`, `finalScore`. `capstone`, `vendorTeam`, `clientContacts` are added empty here and
populated in Phases 3 and 7.

**Files.**
- `src/lib/models.ts` - extend `projectSchema`.
- `src/lib/types.ts` - extend `Project`, add the new enums (`ProjectType`, `AdminStatus`, `ExecutionStatus`).
- `src/lib/constants.ts` - `PROJECT_TYPE_LABELS`, `ADMIN_STATUS_LABELS`, `EXECUTION_STATUS_LABELS`,
  `MIN_REVIEW_THRESHOLD` rule helper.
- `src/lib/actions.ts` - `createProject` takes `projectType`; new `submitForApproval`, and admin
  `approveProject` / `rejectProject`.
- `src/app/(vendor)/projects/new/page.tsx` - add the Whole vs Milestone choice; form copy explains the
  difference (spec section 3 table).
- `src/app/(vendor)/projects/[id]/page.tsx` and `/projects/page.tsx` - surface `adminStatus` and
  `executionStatus` badges; gate the "Publish" path behind `adminStatus === "published"`.
- `src/app/admin/projects/page.tsx` + `.../[id]/page.tsx` (new) - approval queue, approve/reject.
- `src/lib/data.ts` - `listProjectsForAdmin`, filter helpers.

**Migration.** `scripts/migrations/001_project_type_status.ts`:
- `projectType = "whole"` for all existing projects.
- `adminStatus = "published"` where `visibility === "PUBLIC"`, else `"draft"`.
- `executionStatus`: `"completed"` where `status === "COMPLETED"`, else `"ongoing"`.
- `minReviewThreshold` computed from milestone count (1 after Phase 2 migration), `reviewedMilestoneCount = 0`,
  scores null.

**Rules implemented.**
- Vendor picks type once, at creation; not changeable after a second milestone exists (whole -> milestone
  allowed while exactly one milestone and it is `draft`; milestone -> whole never).
- Admin approves the project shell once. Editing top-level fields after approval moves `adminStatus` to
  `"edited"` and requires re-approval, matching the existing pattern the spec points at (spec 5.1). Milestones
  never enter this flow.
- `visibility` / `showInPublic` unchanged in meaning (spec 10).

**Exit criteria.**
- New projects are created as `whole` or `milestone`.
- A project is not publicly visible until `adminStatus === "published"`.
- Admin can approve and reject from `/admin/projects`.
- All existing projects carry sane values for every new field.

---

### Phase 2 - Milestone entity and state machine

**Goal.** `Release` is reshaped into `Milestone`. Every project owns a milestones collection: length 1 for
`whole`, one or more for `milestone`. Milestone lifecycle `draft -> sent -> reviewed` with the sequential rule
and a milestone-scoped edit lock (spec 4.2, 5.3, 6.1, 6.2, 6.3, 10).

**Schema.**
- New `MilestoneModel` (see section 3). Drop `ReleaseModel` and `FeedbackRequestModel` after migration.
- `src/lib/constants.ts` - `MILESTONE_STATUS_LABELS`; remove `RATING_CATEGORIES`, `RELEASE_STATUS_*`.

**Files.**
- `src/lib/models.ts` - add `MilestoneModel`, remove `ReleaseModel` / `FeedbackRequestModel`.
- `src/lib/types.ts` - add `Milestone`, `MilestoneStatus`; remove `Release*`, `FeedbackRequest*` composite types.
- `src/lib/data.ts` - replace all release/feedback reads: `listMilestones(projectId)`,
  `getMilestone(projectId, milestoneId)`, `getProjectWithMilestones`, `getProjectDetail` (milestones + activity).
- `src/lib/actions.ts` - `createMilestone`, `updateMilestone`, `deleteMilestone`, `sendMilestoneForReview`,
  `reopenMilestone` (draft that was never sent). Remove `createRelease`, `updateRelease`, `setReleaseStatus`,
  `requestFeedback`, `resendFeedback`, `submitEvaluation`.
- `src/lib/richtext.ts` (new) - `sanitizeMilestoneHtml(input)` allowing `b`, `strong`, `ul`, `li`, `p`, `br`.
- `src/components/RichTextField.tsx` (new) - small bold + bullet-list editor.
- Routes:
  - `src/app/(vendor)/projects/[id]/milestones/new/page.tsx` (was `releases/new`)
  - `src/app/(vendor)/projects/[id]/milestones/[milestoneId]/page.tsx` (was `releases/[releaseId]`)
  - `src/app/(vendor)/projects/[id]/milestones/[milestoneId]/edit/page.tsx`
  - `src/app/(vendor)/milestones/page.tsx` (was `/releases`) - cross-project milestone list
  - delete `src/app/feedback/[token]/**` (rebuilt authed in Phase 4)
- `src/components/NavShell.tsx`, `src/app/(vendor)/dashboard/page.tsx` - "Releases" -> "Milestones" wording and
  links.

**Migration.** `scripts/migrations/002_release_to_milestone.ts`:
- For each `Release`: create a `Milestone` with `title = name`, `description = <p>` wrapped from
  `description` / `deliverables`, `targetDate = plannedDeliveryDate`, `createdAt` preserved.
- Status map: `REVIEWED` or `CLOSED` -> `reviewed`; `FEEDBACK_REQUESTED` -> `sent`; else `draft`.
- Fold the matching `FeedbackRequest`: `rating = qualityOfDeliverables ?? overallSatisfaction`,
  `comment = comments`, `reviewedAt = completedAt`, `ratingSubmittedAt = completedAt`,
  `sentAt = sentAt`.
- For every `whole` project with zero releases, create one `draft` milestone titled after the project covering
  the engagement.
- Enforce the invariant afterward: exactly one milestone per `whole` project.
- Drop `releases` and `feedbackrequests` collections at the end.

**Rules implemented.**
- **Sequential rule:** `sendMilestoneForReview` fails if any sibling milestone is `sent`. UI disables the action
  with the reason.
- **Milestone-scoped edit lock:** while a milestone is `sent`, `updateMilestone` / `deleteMilestone` on that
  milestone are rejected. Siblings and all `Project` top-level fields stay editable. This replaces the
  spec's "entire project locked" behavior for `milestone` projects (spec 6.3). For `whole` projects, sending the
  single milestone also blocks top-level project edits, preserving today's whole-project lock feel (spec 10).
- Roadmap sketch: `createProject` for a `milestone` type accepts an optional array of milestone stubs
  (title, description, targetDate), all created as `draft`. Nothing is required (spec 6.1).
- Milestones can be added at any time (spec 6.2). Titles plain, descriptions sanitized rich text.
- `whole` projects hide "add milestone"; their one milestone is auto-created at project creation.

**Exit criteria.**
- Existing data browses correctly under the new milestone routes; no reference to `Release` / `FeedbackRequest`
  remains in `src/`.
- Vendor can create, edit, delete, and send milestones, subject to the sequential rule and the lock.
- `whole` projects always have exactly one milestone.
- `npm run build` clean; migration is idempotent on a second run (guards on already-migrated state).

---

### Phase 3 - Vendor team, client contacts, roles, invitations

**Goal.** Per-project people on both sides with the four roles, and invite flows wired to Phase 0
(spec 4.3, 4.4, 7, 8).

**Schema.** Populate `Project.vendorTeam` and `Project.clientContacts` (embedded, section 3). `Invitation`
already exists from Phase 0.

**Files.**
- `src/lib/permissions.ts` (new) - pure guards taking `(user, project)`:
  `isVendorOwner`, `isVendorMember`, `isPrimaryContact`, `isCollaborator`, plus action-level:
  `canEditMilestone`, `canSendMilestone`, `canInviteTeammate`, `canRequestCompletion`, `canRateMilestone`,
  `canConfirmCompletion`, `canInviteCollaborator`.
- `src/lib/actions.ts` - `inviteVendorTeamMember`, `removeVendorTeamMember`, `inviteClientContact`,
  `reassignPrimaryContact`, `inviteCollaborator`, `acceptInvitation(token)`.
- `src/app/invite/[code]/page.tsx` (new) - accept flow: verify code, create or match `User`, attach to
  `Project`, clear `invitePending`.
- `src/app/(vendor)/projects/[id]/team/page.tsx` (new) - manage vendor team + client contacts.
- `src/app/(client)/projects/[id]/people/page.tsx` (new) - primary contact manages collaborators.
- `src/app/(vendor)/projects/new/page.tsx` - optional teammate + primary-contact invites at creation
  (spec 6.1, 8).
- `src/lib/data.ts` - `listProjectsForUser(user)` for both home areas; include people in project reads.
- Apply `permissions.ts` guards inside every vendor and client action added so far.

**Rules implemented.**
- Vendor Owner: create/edit milestones, invite/remove teammates (Owner or Member), invite/reassign primary
  contact, request completion.
- Vendor Member: edit milestones only.
- Client Primary Contact: rate milestones, confirm completion, invite Collaborators. Exactly one per project;
  vendor reassigns with no handoff ceremony (spec 4.4).
- Client Collaborator: view only.
- Collaborators cannot invite anyone. Primary Contact can invite only after accepting their own invite and
  signing in (spec 8).
- Invites never require admin approval (spec 8, 9).
- Vendor teammate invites reuse the same email + code mechanism when the invitee has no account (spec 8).

**Exit criteria.**
- All four roles enforced across every action, verified by `permissions.ts` unit tests.
- An invited client can accept, sign in, and see the project in "My Projects".
- Exactly one primary contact invariant holds through reassignment.

---

### Phase 4 - PMD and client milestone rating

**Goal.** A shared project view for both sides, and the lightweight client rating that drives `draft -> sent ->
reviewed` to completion (spec 1, 4.2, 6.4, 6.5).

**Schema.** No new models. `Milestone.rating`, `comment`, `ratingSubmittedAt`, `reviewedAt`,
`editRequestedByVendor` come into use.

**Files.**
- `src/app/(client)/projects/[id]/page.tsx` (new) - client PMD: milestones, statuses, running score once the
  threshold is met (Phase 5), execution status, the rate action on the milestone that is `sent`.
- `src/app/(vendor)/projects/[id]/page.tsx` - becomes the vendor view of the same PMD data.
- `src/lib/actions.ts` - `submitMilestoneRating(projectId, milestoneId, { rating, comment })`,
  `editOwnMilestoneRating(...)` (self-correction window), `requestRatingReconsideration(projectId, milestoneId)`.
- `src/components/RatingInput.tsx` - reused as-is for the single 1-5 star input, labeled
  "Quality of Deliverables".
- `src/lib/notifications.ts` (new) - `notify(projectId, audience, message)` writes an `Activity` row and a
  lightweight `Notification` list entry; no email.
- `src/lib/data.ts` - `getPmd(projectId, user)` returning a role-shaped view model.

**Rules implemented.**
- Only the Primary Contact can rate (`canRateMilestone`). Submitting sets `rating`, `comment`,
  `ratingSubmittedAt = now`, `reviewedAt = now`, `status = reviewed`, then recomputes the running average
  (Phase 5).
- **Client self-correction:** the Primary Contact may call `editOwnMilestoneRating` with no request while
  `now - ratingSubmittedAt <= RATING_SELF_CORRECTION_HOURS` (default 48). After the window, the action is
  rejected.
- **Vendor-requested reconsideration:** `requestRatingReconsideration` is allowed once per milestone, guarded by
  `editRequestedByVendor`. It notifies the client and sets the latch permanently true (the "once" is lifetime,
  not per-cycle). The vendor cannot write the rating. The client responds by calling `editOwnMilestoneRating`
  (the window guard is bypassed when `editRequestedByVendor` is true) or by doing nothing.
- No multi-step form, no attributes, no written summary at milestone level (spec 6.4).

**Exit criteria.**
- Primary Contact rates the `sent` milestone; it moves to `reviewed`; the next milestone can then be sent.
- Self-correction works inside the window and is refused outside it.
- A second vendor reconsideration request on the same milestone is refused.
- Collaborators and vendor users cannot rate.

---

### Phase 5 - Scoring, PCS stand-in, public visibility threshold

**Goal.** A running average that recalculates on every review, feeds a PCS stand-in, and is shown publicly only
after a threshold (spec 6.6, 6.7).

**Schema.** `Project.liveScore`, `reviewedMilestoneCount`, `minReviewThreshold` maintained on every milestone
review and whenever milestones are added or removed.

**Files.**
- `src/lib/scoring.ts` (new) - pure: `runningAverage(milestones)`, `meetsPublicThreshold(project)`
  (`reviewedMilestoneCount >= min(2, ceil(0.25 * totalMilestoneCount))`), `projectCapabilityScore(project)`
  (PCS stand-in: for `milestone` projects returns `liveScore` / `finalScore`; for `whole` returns the single
  milestone rating).
- `src/lib/derived.ts` - repoint `computeProjectPerformance`, `computeDashboardKpis`, `computeAlerts`,
  `computeRatingTrend` from the old `FeedbackRequest.overallSatisfaction` to `scoring.ts` and milestone data.
- `src/lib/actions.ts` - milestone review, create, delete all call a shared `recomputeProjectScore(projectId)`.
- `src/app/(vendor)/projects/[id]/public-preview/page.tsx` and `.../publish/page.tsx` - show score only when
  `meetsPublicThreshold`; otherwise show `executionStatus` ("ongoing") with no number (spec 6.7).
- `src/app/(vendor)/dashboard/page.tsx`, `/projects/page.tsx` - "Verified Delivery Performance" / rating columns
  read from `scoring.ts`.
- `src/lib/constants.ts` - `MIN_REVIEW_THRESHOLD` helper, comment noting it is the spec section 11 default.

**Rules implemented.**
- Running average is across `reviewed` milestones only, recomputed every review, not just at completion
  (spec 6.6).
- PCS input path for `milestone` projects is the live average, recomputed each review (spec 6.6, 10).
- Public page shows the average while `ongoing` once the threshold is met; before that, status only (spec 6.7).
- Removing or adding milestones recomputes `minReviewThreshold` and can move a project back below the threshold.

**Exit criteria.**
- Score changes visibly on each new review in both the PMD and the public preview.
- Below-threshold projects show status with no score on the public preview.
- Dashboard and project list numbers match `scoring.ts` output for seeded data.
- `scoring.ts` has unit tests covering threshold edges (1 vs 2 milestones, 4 vs 8 total, 0 reviewed).

---

### Phase 6 - Completion flow and admin timeout

**Goal.** Two-sided completion with a 7-day admin fallback (spec 5.2, 6.8).

**Schema.** `Project.completionRequestedAt`, `completionConfirmedByClient`, `completionForcedByAdmin`,
`finalScore`, `executionStatus` transitions.

**Files.**
- `src/lib/actions.ts` - `requestCompletion(projectId)` (vendor Owner), `confirmCompletion(projectId)` (client
  Primary Contact), `forceCompleteProject(projectId)` (admin).
- `src/lib/constants.ts` - `COMPLETION_TIMEOUT_DAYS = 7`.
- `src/app/(vendor)/projects/[id]/page.tsx` - "Request completion" for Owner when `executionStatus === "ongoing"`.
- `src/app/(client)/projects/[id]/page.tsx` - "Confirm completion" for Primary Contact when
  `awaiting_completion`.
- `src/app/admin/projects/page.tsx` - list projects where `awaiting_completion` and
  `now - completionRequestedAt >= 7 days`, with a force-complete action.
- `src/lib/data.ts` - `listProjectsAwaitingCompletionTimeout()`.

**Rules implemented.**
- Step 1: Owner only. `executionStatus -> awaiting_completion`, `completionRequestedAt = now`, client notified.
- Step 2: Primary Contact only. `executionStatus -> completed`, `finalScore = liveScore` (may be null),
  `completionConfirmedByClient = true`.
- Step 3: Admin force-complete allowed only after 7 days in `awaiting_completion`. Uses whatever ratings exist.
  Zero reviewed milestones -> completes with `finalScore = null` (unrated, same as a project today that never
  got an endorsement). `completionForcedByAdmin = true` (spec 6.8).
- A project never auto-completes just because all milestones are `reviewed` (spec 6.8).
- After `completed`: no new milestones, no sends, no rating edits. Capstone is the only remaining action.

**Exit criteria.**
- Full happy path: request -> confirm -> `completed` with a locked `finalScore`.
- Force-complete is hidden before day 7 and works after, including the zero-rating case.
- Post-completion milestone actions are refused.

---

### Phase 7 - Capstone endorsement

**Goal.** A one-time qualitative wrap-up after completion, reusing EOS-2508-style attribute pools via a local
stand-in, tiered off the final milestone average (spec 4.5, 6.9, 10).

**Schema.** `Project.capstone` subdocument (section 3).

**Files.**
- `src/lib/attributes.ts` (new) - a hardcoded pool split into three tiers, plus
  `tierForScore(score)` using Promoter `>= 4.0`, Neutral `2.51 - 3.9`, Detractor `<= 2.5`.
- `src/lib/actions.ts` - `requestCapstone(projectId)` (vendor, after `completed`), `submitCapstone(projectId,
  { attributes, testimonial, anonymous })` (client Primary Contact).
- `src/app/(client)/projects/[id]/capstone/page.tsx` (new) - pick up to 5 attributes from the frozen tier pool,
  write a short summary, optional anonymous toggle. No stars.
- `src/app/(vendor)/projects/[id]/page.tsx` - "Request capstone endorsement" as a separate optional action,
  visible only when `executionStatus === "completed"` and `capstone` not yet requested.
- `src/app/(vendor)/projects/[id]/public-preview/page.tsx` + publish - render submitted capstone (attributes +
  testimonial), honoring `anonymous`.

**Rules implemented.**
- Requesting the capstone is separate from and never bundled with requesting completion (spec 6.9).
- Tier is chosen from `finalScore`, not a fresh rating, and frozen onto `capstone.tier` at request time
  (spec 6.9, 10).
- Client picks at most 5 attributes from that tier's pool; writes a testimonial; optional anonymous.
- No star ratings anywhere on this entity (spec 4.5, 6.9).

**Exit criteria.**
- Vendor requests capstone only after completion; client submits attributes + testimonial; it renders on the
  public preview with anonymity respected.
- Attribute choices are constrained to the frozen tier pool and capped at 5.

---

### Phase 8 - Cleanup, seed, polish

**Goal.** Remove dead code, refresh the seed, tidy constants and docs.

**Files.**
- Delete any remaining `Release` / `FeedbackRequest` / token-feedback references, `RATING_CATEGORIES`,
  `RELEASE_STATUS_*`, `/releases` and `/feedback` routes.
- `src/components/NavShell.tsx` - final nav: My Projects (client) / Projects + Milestones (vendor) / Admin.
- `src/lib/derived.ts` - `computeAlerts` updated to milestone-era signals: milestone overdue (`targetDate`
  passed while `draft`/`sent`), milestone awaiting rating (`sent` older than N days), project
  `awaiting_completion` past 7 days, project at risk (`liveScore` below the existing `AT_RISK_RATING_THRESHOLD`).
- `scripts/seed.ts` - rebuild: one `whole` project, two `milestone` projects at different execution stages
  (one below threshold, one completed with a capstone), vendor team of 2, a primary contact + a collaborator,
  a pending invite, an admin user.
- `src/lib/constants.ts` - all TBD numbers grouped with a comment block pointing at spec section 11.
- `README.md` / `AGENTS.md` - note the new auth requirement and the milestone model.
- Add `vitest` config + `npm test`; ensure `permissions.ts`, `scoring.ts`, and the milestone state-machine
  guards have coverage.

**Exit criteria.**
- `npm run build`, `npm run lint`, `npm test` all clean.
- `npm run db:seed` produces a database that exercises every phase's surface.
- No dead references to retired models or routes.

---

## 5. Sequencing and parallelism

```
Phase 0 (auth) ─────────────┐
Phase 1 (project type) ─────┼──> Phase 3 (people/roles) ──> Phase 4 (PMD + rating) ──> Phase 5 (scoring)
Phase 2 (milestones) ───────┘                                                              │
                                                                                          v
                                                              Phase 6 (completion) ──> Phase 7 (capstone) ──> Phase 8 (cleanup)
```

- **Phases 1 and 2 can start immediately and in parallel with Phase 0.** They are vendor-side and do not need
  accounts. Use the seeded vendor user as a stand-in until Phase 0 lands.
- **Phase 3 needs 0, 1, and 2.**
- **Phase 4 needs 3.** Phases 5 and 4 are close but 5 depends on the review action existing, so 4 first.
- **Phases 6, 7, 8 are strictly sequential at the end.**
- Migrations run in numeric order: `000` (Phase 0), `001` (Phase 1), `002` (Phase 2). Later phases add data but
  no further destructive migrations.

Rough size, for planning only: Phase 0 and Phase 2 are the two largest. Phase 5 is small but touches many files.
Phase 8 is bounded.

---

## 6. Cross-cutting work threaded through every phase

- **Permissions.** Every server action added from Phase 3 on starts with a `permissions.ts` guard. No action
  trusts the client-supplied role.
- **Migrations are idempotent.** Each script checks for its own completion marker (a field value or collection
  absence) and is safe to re-run.
- **Notifications are in-app only.** `notify()` writes an `Activity` row plus a `Notification` entry. Wherever
  the spec says "client notified" / "Client notified", that is the mechanism. SMTP is a labeled TODO.
- **Rich text stays narrow.** Only `b`/`strong`, `ul`, `li`, `p`, `br`. Sanitize on write and on render.
- **Constants over literals.** Every spec section 11 number and the 7-day window live in `constants.ts`.
- **Server Actions + Mongoose** pattern is kept throughout; no API routes introduced except the auth and invite
  accept pages, which are still Server Actions behind page components.

---

## 7. Open items still needing a decision

These do not block starting Phase 0-2. They must be settled before the phase that consumes them.

| Item | Needed by | Default this plan assumes | Notes |
|---|---|---|---|
| Minimum review threshold formula | Phase 5 | `min(2, ceil(0.25 * total))` reviewed | Spec section 11 suggestion. One-line change in `constants.ts`. |
| Self-correction window length | Phase 4 | 48 hours | Spec says 24-48h. |
| Rich text storage format | Phase 2 | Sanitized HTML + tiny contenteditable editor | Alternative: store Markdown, render with a small parser. |
| Whole Project rating shape | Phase 2 | Same single "Quality of Deliverables" 1-5 as any milestone; multi-dimension form retired entirely | If the multi-dimension endorsement must survive for Whole Projects, that is a deviation from spec 6.4/10 and adds a second rating path. |
| Admin surface depth | Phase 1 | Minimal: approval queue + force-complete list, role-gated | No audit log, no admin user management UI. |
| `private_docs/` in version control | now | Left tracked | If this folder is meant to stay local, add `private_docs/` to `.gitignore`. |

---

## 8. What is explicitly out of scope for this plan

- Real email / SMTP delivery for codes, invites, and notifications.
- A migration framework. Scripts are manual and numbered.
- The full EOS company model, real PCS algorithm, and the real EOS-2508 adaptive attribute pools. Local
  stand-ins only, with clean seams where the real versions could later replace them.
- UI visual design. Routes and components are functional, styled with the existing Tailwind primitives in
  `ui.tsx` / `form.tsx`.
- Integration and end-to-end tests. Unit tests cover pure logic only.
