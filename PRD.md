# EOS Performance Monitoring & Release-Based Client Feedback

**Product Requirements Document (PRD)**
**Version:** 1.0
**Date:** August 24, 2026

---

## 1. Overview

Enosis Outsourcing currently allows companies to:

* Add projects to their company profile.
* Publish those projects publicly.
* Request client endorsements.
* Display project information, Project Capability Score (PCS), client feedback, and other project-related information publicly.

The new feature will extend the existing Project Management system by introducing a **private project delivery and performance monitoring workflow**.

A vendor will be able to:

1. Create a private client project.
2. Add multiple releases under that project.
3. Track the progress of each release.
4. Request client feedback after individual releases.
5. Monitor client satisfaction and delivery performance from a centralized **Performance Monitoring Dashboard**.
6. Keep the project private indefinitely if desired.
7. Convert the private project into an EOS public project when appropriate.

This feature is intended to make EOS useful not only for showcasing completed work, but also for **ongoing vendor performance management and client relationship monitoring**.

---

# 2. Product Objectives

The feature should help vendors answer questions such as:

* How many client projects are currently active?
* How many releases are currently in progress?
* Which releases are waiting for client feedback?
* How satisfied are clients with recent releases?
* Is client satisfaction improving or declining?
* Which projects or clients may require attention?
* Which projects have consistently strong delivery performance?
* Which completed/private projects could be converted into public portfolio projects?

For EOS, this also creates a stronger source of verified first-party performance data based on actual ongoing client engagements.

---

# 3. Core Concepts

## 3.1 Private Project

A Private Project represents an actual vendor-client engagement being managed through EOS.

It is **not publicly visible** and does not automatically appear on:

* Company profile
* Explore Projects
* Search results
* Similar Projects
* Public project pages
* Search engine index
* Sitemap

A private project may remain private for its entire lifecycle.

---

## 3.2 Release

A Release represents a specific delivery, milestone, sprint outcome, product version, or agreed deliverable within a project.

Example:

**Project:** E-commerce Platform Development

Possible releases:

* Release 1 — Product Catalog
* Release 2 — Shopping Cart
* Release 3 — Payment Integration
* Release 4 — Customer Dashboard
* Release 5 — Production Launch

There is no fixed limit to the number of releases that can exist under a project.

---

## 3.3 Release Evaluation

After a release has been delivered, the vendor can request feedback from the client.

The client evaluates the performance of that **specific release**, rather than evaluating the entire project.

The rating becomes part of the project's historical performance data.

---

## 3.4 Public Project

A Private Project can later be converted into the existing EOS Public Project format.

The existing public project experience should remain the public-facing destination.

The private project does **not** need to contain every field currently required by the public Project form.

When publishing, EOS should:

1. Pre-fill applicable information from the Private Project.
2. Allow the vendor to complete any additional information required for the public project.
3. Allow the vendor to choose which eligible performance information can appear publicly.
4. Keep private/internal information hidden.

> **Reference implementation:** The current EOS public project detail page (e.g. the "Mobile App Development for Digital Media Agency" page by Konstant Infosolutions Pvt Ltd for client Gravity77 Pty Ltd) is the existing target format this feature converts into. It displays: status badges (Endorsed/Completed), project hero image with platform tags, industry/duration/budget/start date/team size/engagement model, Project Capability Score (PCS) with breakdown, client name & country, Project Summary, Key Challenges, Project Deliverables, Project Solution, Project Outcome, Platforms, Tech Stack, Client Endorsement (overall rating + Timeliness/Cost Rating/Willing to Refer/Quality of Deliverables sub-ratings + written quote + endorser name/title/date), and "More Projects by this vendor" with PCS scores. Any private→public conversion (§18–21) should map into this same page structure, with release-derived performance signals (§21, e.g. "8 Releases Reviewed / Average Client Rating: 4.8/5 / 95% Client Satisfaction") surfaced as an additional, clearly-labeled verified-performance section rather than replacing the existing Client Endorsement block.

---

# 4. User Roles

## Vendor Company Owner / Admin

Should be able to:

* Create private projects.
* Edit projects.
* Add and manage releases.
* Invite clients for release evaluations.
* View client ratings.
* Monitor project/release performance.
* Manage project visibility.
* Initiate publication.
* Approve a client-initiated publication request.
* Archive projects.

---

## Vendor Team Member / Project Manager

Depending on assigned permissions, should be able to:

* Access assigned projects.
* Create/edit releases.
* Update release status.
* Request client feedback.
* View project performance.

Publishing permission may be restricted to Company Owner/Admin users.

---

## Client

The client should be able to:

* Access an invited release.
* Review relevant release information.
* Submit a release evaluation.
* Provide comments.
* See confirmation after submitting feedback.
* Initiate/request publication of the overall project if they want the engagement showcased publicly.

A client should not receive access to unrelated vendor projects.

---

## EOS Admin

EOS administrators should be able to:

* View projects and releases.
* View rating history.
* Investigate suspicious feedback.
* Manage reported content.
* Disable fraudulent or invalid evaluations.
* Moderate public project publication where the existing EOS workflow requires moderation.
* Unpublish a public project if required.

---

# 5. Private Project Creation

A vendor should have a new option such as:

**Create Project**

The project should be **Private by default**.

### Suggested Private Project Fields

**Basic Information**

* Project Name — Required
* Client Company Name — Required
* Client Contact Name
* Client Email — Required for feedback requests
* Project Services
* Project Description / Scope
* Project Start Date
* Expected Completion Date
* Actual Completion Date
* Project Status
* Team Size
* Engagement Model
* Internal Project Reference / ID
* Project URL — Optional

### Project Status

Recommended statuses:

* Active
* On Hold
* Completed
* Cancelled
* Archived

Project visibility should be maintained separately:

**Visibility: Private / Public**

This prevents project delivery status and publication status from becoming mixed.

---

# 6. Project Detail / Management Page

Each private project should have its own management page.

Example:

**Project: ABC Mobile Application**

The page should contain:

### Project Overview

Basic project information, client, status, dates and project details.

### Performance Summary

* Average Release Rating
* Number of Releases
* Releases Completed
* Releases Currently In Progress
* Client Feedback Response Rate
* Latest Client Rating
* Overall Client Satisfaction Status
* Rating trend

### Releases

A chronological list of all releases belonging to the project.

### Client Feedback History

Historical feedback received across releases.

### Activity History

Important events such as:

* Release created
* Release delivered
* Feedback requested
* Feedback received
* Project completed
* Publication requested
* Project published

---

# 7. Release Management

Vendors should be able to create multiple releases underneath each project.

### Release Fields

* Release Name — Required
* Release Number / Version — Optional
* Release Description
* Release Objectives
* Deliverables
* Planned Delivery Date
* Actual Delivery Date
* Release Start Date
* Release Status
* Release URL / Demo URL — Optional
* Attachment(s) — Optional
* Internal Notes — Private
* Client-facing Notes
* Team Members / Team Size — Optional

Example:

**Release Name:** Release 3 — Payment Gateway Integration
**Planned Delivery:** August 10
**Actual Delivery:** August 12

---

# 8. Release Status Workflow

Recommended workflow:

**Draft → In Progress → Delivered → Feedback Requested → Reviewed → Closed**

Additional derived indicators can include:

* Due Soon
* Overdue
* Feedback Pending

These should preferably be calculated automatically rather than treated as separate manual statuses.

For example:

If Planned Delivery Date has passed and the Release is still In Progress:

**Overdue**

---

# 9. Client Feedback Request

After a release has been delivered, the vendor should see:

**Request Client Feedback**

The system should send the client a secure email invitation.

The invitation should identify:

* Vendor
* Project
* Release
* Release date
* Short release summary

The client should be taken directly to the evaluation page.

For lower friction, EOS should not require the client to create a full company account simply to submit a requested evaluation.

The secure invitation should be tied to:

* Project
* Release
* Client email
* Unique secure invitation/token

---

# 10. Release Rating Form

The evaluation should focus on the performance of the specific release.

### Recommended Rating Categories

Each category uses a **1–5 rating scale**.

**Required**

* Overall Satisfaction
* Quality of Deliverables
* Timeliness
* Communication & Collaboration

**Recommended**

* Understanding of Requirements
* Delivery Against Agreed Scope
* Would You Continue Working With This Vendor?

### Written Feedback

Optional:

**Comments about this release**

Example:

> The release met the agreed requirements and communication was excellent throughout the delivery process.

---

# 11. Rating Integrity

Client feedback is a critical trust signal and should therefore have integrity controls.

A vendor:

* Cannot submit a client rating on behalf of the client.
* Cannot change the rating provided by a client.
* Cannot change the client's written feedback.
* Can resend a feedback request.
* Can see whether the request is Pending or Completed.

The system should record:

* Reviewer
* Client email
* Submission date
* Project
* Release
* Individual rating values
* Overall score
* Written feedback
* Verification status

Client release feedback should remain separate from vendor-entered internal notes.

---

# 12. Performance Monitoring Dashboard

A new dashboard should be available to vendors:

# Performance Monitoring Dashboard

The purpose of this dashboard is to provide an overall picture of the vendor's ongoing project delivery and client satisfaction.

---

## 12.1 KPI Summary

The top of the dashboard should display high-level metrics such as:

### Active Projects

Number of currently active client projects.

### Active Releases

Number of releases currently in progress.

### Releases Delivered

Number delivered during the selected period.

### Awaiting Client Feedback

Delivered releases where feedback has been requested but not yet received.

### Average Release Rating

Average client rating across reviewed releases.

### Client Satisfaction Rate

Percentage of rated releases that meet the defined satisfaction threshold.

### At-Risk Projects

Projects where recent client feedback indicates potential dissatisfaction.

---

# 13. Client Satisfaction Classification

To make the dashboard immediately understandable, EOS can translate average/latest ratings into a simple health status.

Suggested initial logic:

| Rating    | Status          |
| --------- | --------------- |
| 4.0–5.0   | Happy           |
| 3.0–3.9   | Needs Attention |
| Below 3.0 | At Risk         |

Example:

**ABC Ltd — Happy — 4.7/5**

**XYZ Ltd — Needs Attention — 3.5/5**

**Example Corp — At Risk — 2.6/5**

The exact thresholds should be configurable so they can be adjusted later without redesigning the feature.

---

# 14. Performance Trend

The dashboard should show performance over time.

Example periods:

* Last 30 Days
* Last 90 Days
* Last 6 Months
* Last 12 Months
* Custom Range

Potential chart:

**Average Release Rating Over Time**

This allows the vendor to see whether performance is:

* Improving
* Stable
* Declining

---

# 15. Project Performance Table

The dashboard should contain a project-level performance table.

Recommended columns:

| Project | Client | Status | Active Releases | Total Releases | Avg. Rating | Latest Rating | Client Health | Last Activity |
| ------- | ------ | -----: | --------------: | -------------: | ----------: | ------------: | ------------- | ------------- |

Users should be able to filter by:

* Project
* Client
* Project Status
* Client Health
* Rating
* Date Range

---

# 16. Release Performance Table

A separate view should show release-level information.

Recommended columns:

| Release | Project | Client | Delivery Date | Status | Feedback Status | Rating | Actions |
| ------- | ------- | ------ | ------------- | ------ | --------------- | -----: | ------- |

Example actions:

* View Release
* Edit Release
* Request Feedback
* Resend Feedback Request
* View Feedback

---

# 17. Alerts / Attention Required

The dashboard should surface items that need vendor attention.

Examples:

**3 Releases Awaiting Feedback**

**2 Releases Overdue**

**1 Project Received a Rating Below 3.0**

**Client Satisfaction Declined on Project ABC**

These alerts should link directly to the relevant project or release.

---

# 18. Publishing a Private Project

Publishing must be optional.

A vendor may manage hundreds of releases/projects privately without ever making them public.

A Private Project should display an action such as:

**Publish Project**

or

**Convert to Public Project**

---

# 19. Publication Workflow

Either the **Vendor or Client may initiate a publication request**.

However, publishing should respect project confidentiality.

### Vendor Initiates Publication

Vendor selects:

**Publish Project**

EOS opens a publication form pre-populated with available project information.

The vendor completes any missing information required for the existing public project experience.

Where identifiable client information or client feedback will be displayed, appropriate client consent should be recorded.

---

### Client Initiates Publication

The client may select:

**Recommend This Project for Publication**

The vendor receives a notification.

The vendor can then:

* Review the project.
* Complete missing public information.
* Approve publication.
* Decline publication.

This prevents a client from independently modifying or publishing the vendor's company profile content.

---

# 20. Private-to-Public Data Mapping

The private project may contain fewer or different fields than the existing public project.

Therefore EOS should **not require the Private Project form to replicate the current Public Project form**.

When converting, applicable data should be carried forward automatically.

Examples:

* Project Name
* Client
* Services
* Duration
* Team Size
* Project Description
* Dates
* Engagement Model

The publication workflow can then request additional public information such as:

* Project Image
* Project Summary
* Key Challenges
* Deliverables
* Project Solution
* Project Outcome
* Platforms
* Tech Stack
* Budget
* Client Logo

This approach avoids making everyday private project management unnecessarily complicated.

---

# 21. Release Ratings and Public Projects

Release evaluations should be **private by default**.

Publishing a project should not automatically expose:

* Individual release ratings
* Private client comments
* Internal release information
* Internal notes
* Attachments
* Sensitive delivery information

During publication, EOS may allow approved performance information to be displayed.

Example:

**Verified Delivery Performance**

* 8 Releases Reviewed
* Average Client Rating: 4.8/5
* 95% Client Satisfaction

This should only use eligible verified feedback and appropriate client consent.

Individual release-level comments should not automatically become public endorsements.

---

# 22. Relationship With Existing Client Endorsement

The existing **Client Endorsement** feature should continue to exist.

Release Evaluation and Public Project Endorsement should be treated as two different concepts.

### Release Evaluation

Purpose:

Continuous delivery-performance monitoring.

Scope:

One specific release.

Primarily private.

### Project Endorsement

Purpose:

Public credibility and social proof.

Scope:

Overall project/client relationship.

Primarily public.

A strong history of release feedback may later make it easier for a client to provide a final Project Endorsement.

For example, once a project is completed:

**Request Final Project Endorsement**

could use the existing EOS endorsement workflow.

---

# 23. Notifications

The system should provide notifications for important events.

Recommended initial notifications:

* Client feedback requested
* Feedback request reminder
* Client submitted feedback
* Low client rating received
* Release approaching delivery date
* Release overdue
* Client requested project publication
* Publication approved
* Publication rejected
* Project successfully published

Vendor notifications should appear within EOS and, where appropriate, through email.

---

# 24. Privacy & Confidentiality

Private projects must remain genuinely private.

Private Project and Release data must not appear in:

* Public company profiles
* Public APIs intended for profile/project discovery
* Explore Projects
* Similar Projects
* Search engines
* XML sitemaps
* Structured data
* Public URLs accessible without authorization

Internal Notes should never be exposed to clients.

Client-facing information should be clearly separated from vendor-only information.

Publishing a project should never automatically make all private project data public.

---

# 25. Performance Metric Definitions

To prevent ambiguity in reporting, dashboard metrics should have clearly defined calculations.

### Active Projects

Projects where:

`Project Status = Active`

### Active Releases

Releases where:

`Release Status = In Progress`

### Awaiting Feedback

Releases where:

* Release has been delivered.
* Feedback request has been sent.
* Client has not submitted feedback.

### Average Release Rating

Average Overall Satisfaction score from completed verified release evaluations.

### Client Satisfaction Rate

Percentage of completed evaluations where Overall Satisfaction is **4.0 or higher**, using the initial recommended threshold.

### Feedback Response Rate

`Completed Feedback Requests ÷ Total Feedback Requests Sent × 100`

### At-Risk Project

Initially, a project may be classified as At Risk where the latest verified Overall Satisfaction rating is below **3.0**.

The rules should be designed so EOS can refine the algorithm later.

---

# 26. Audit Trail

EOS should maintain an audit history for important actions including:

* Project creation
* Project edits
* Release creation
* Release delivery
* Feedback request
* Feedback submission
* Status changes
* Publication request
* Publication approval/rejection
* Public/private visibility changes

This is particularly important because client feedback may later be used as a trust or performance signal.

---

# 27. Search and Filters

Within the vendor dashboard, users should be able to search/filter projects using:

* Project Name
* Client
* Project Status
* Release Status
* Rating
* Client Health
* Date Range
* Private/Public Status

---

# 28. Suggested Navigation

Within the existing Company Dashboard:

**Project Management**

* Projects
* Releases
* Performance Dashboard

Alternatively:

**Project Management**

* All Projects
* Active Projects
* Releases
* Performance

The final navigation should avoid making Public Projects and Private Projects feel like completely unrelated products.

---

# 29. Empty States

Appropriate empty-state messaging should guide first-time users.

### No Projects

**Start monitoring client delivery performance**

Create your first client project, manage releases, collect client feedback, and track performance over time.

**Create Project**

### Project With No Releases

**No releases added yet**

Add the first release to start tracking this project's delivery performance.

**Add Release**

### No Client Feedback

**No client ratings yet**

Request feedback after delivering a release to start measuring client satisfaction.

---

# 30. Admin Requirements

EOS Admin should have visibility into:

* Total Private Projects
* Total Public Projects
* Active Projects
* Total Releases
* Feedback Requests
* Completed Evaluations
* Average Ratings
* Flagged/Suspicious Evaluations
* Projects converted from Private → Public

Admins should also be able to search by:

* Vendor
* Client
* Project
* Release

Admin access must not cause private project information to become publicly available.

---

# 31. MVP Scope

The initial release should focus on the core workflow.

### MVP

1. Private Project creation and management
2. Multiple Releases per Project
3. Release status tracking
4. Client feedback invitation
5. 1–5 release ratings
6. Client comments
7. Performance Monitoring Dashboard
8. Client satisfaction / health indicator
9. Feedback history
10. Private-to-Public Project conversion
11. Email/in-app notifications
12. Admin visibility and moderation
13. Privacy and permission controls

---

# 32. Future Enhancements

These features should not block the MVP but the data model should avoid preventing them later.

Potential future enhancements:

* Jira integration
* Linear integration
* GitHub/GitLab integration
* Automatic release imports
* Sprint-level performance
* SLA monitoring
* Delivery delay analytics
* AI-generated performance insights
* AI-generated risk detection
* Client sentiment analysis
* Benchmark vendor performance against EOS averages
* Multi-client contacts per project
* Multiple reviewers per release
* Vendor team member performance
* Project financial performance
* Release approval workflow
* Client portal
* Monthly/quarterly performance reports

---

# 33. Key User Journey

The primary workflow should be:

**Vendor creates Private Project**

↓

**Vendor adds Release**

↓

**Vendor works on Release**

↓

**Release Delivered**

↓

**Vendor requests Client Feedback**

↓

**Client rates Release**

↓

**Performance Dashboard updates**

↓

**Next Release created**

↓

**Additional client ratings collected**

↓

**EOS builds project performance history**

↓

Project may remain **Private**

**OR**

Vendor/Client initiates publication

↓

Vendor completes Public Project information

↓

**Project becomes an EOS Public Project**

↓

Public Project may display approved project information, PCS, endorsements, and eligible verified performance signals.

---

# 34. Acceptance Criteria

The feature will be considered functionally complete when:

* A vendor can create a project without publishing it publicly.
* A private project can contain multiple releases.
* A vendor can update release progress/status.
* A vendor can send a release-specific feedback request to the client.
* A client can securely submit a release rating.
* A vendor cannot modify submitted client ratings.
* Client ratings automatically contribute to project performance metrics.
* Vendors can see active projects, releases, feedback status, average ratings and client health from the Performance Monitoring Dashboard.
* Vendors can identify low-performing or at-risk projects.
* Historical release performance remains available after additional releases are created.
* Private project/release information cannot be accessed publicly.
* A private project can remain private permanently.
* Either the client or vendor can initiate a request to make a project public.
* The vendor can convert an eligible private project into the existing EOS Public Project structure.
* Applicable private project information is carried into the publication workflow.
* Missing public-project information can be completed during publication.
* Private/internal information is not exposed automatically.
* Existing EOS Public Projects, PCS and Client Endorsements continue to function.
* EOS Admin can monitor and moderate the new project/release/feedback system.

---

# 35. Product Principle

The core principle of this feature should be:

> **Manage privately. Measure continuously. Publish selectively.**

EOS should allow vendors to use real client projects for continuous performance management without requiring those projects to become marketing content.

When a project is eventually made public, EOS will already have a richer history of delivery performance and verified client interaction behind it.

---

# Appendix A: Existing EOS UI Reference

Captured from the current live product, to ground the field mapping in §5, §20, and the destination page in §3.4. Any new Private Project / Release / Publication UI should stay visually and structurally consistent with these existing screens rather than introducing a parallel design language.

## A.1 Existing "New Project" Entry Form (Public Project Creation)

Company Dashboard → Edit Company → Project entry form (example: Waverley Software).

Fields, in form order:

* **Project Name*** — text
* **Project Services*** — multi-select dropdown
* **Project URL** — optional text; hint: "This can be a live project link, case study or any public link that shows this project exists."
* **Project Image*** — upload; recommended 1920×1080 (16:9); png/svg/jpeg/jpg/webp; max 1MB. Paired Do's/Don'ts guidance panel (use real product screenshots, clean/high-contrast, focused visuals; avoid generic stock photos, client logos under NDA, blurry/low-res images).
* **Client Company Logo** — upload; recommended 512×512 (1:1); same file types/size limit.
* **Client Company Name*** — text, with an adjacent **"Mark as Confidential"** checkbox (ⓘ tooltip). *This is the existing precedent for hiding client identity — directly relevant to the privacy/consent model in §19 and §24.*
* **Client Industry*** — dropdown
* **Client Budget*** — dropdown
* **Client Size** — dropdown
* **Client Country*** — dropdown
* **Client City/State** — dropdown (dependent on Country)
* **Number of Team Members Involved in This Project*** — dropdown
* **Engagement Model*** — dropdown
* **Project Summary*** — rich text (list/bold/italic toolbar)
* **Key Challenges** — rich text
* **Project Solution** — rich text
* **Project Deliverables*** — rich text
* **Project Outcome*** — rich text
* **Tech Stack Used*** — dropdown (multi)
* **Platform Used*** — dropdown
* **Start Date*** / **End Date*** — date pickers, with a **"This project is ongoing"** checkbox that presumably disables/hides End Date
* Footer: autosave timestamp ("Last saved at …"), **Save** (draft) and **Publish Project** actions

Implication for §20 (Private-to-Public Data Mapping): the private project's minimal field set (§5) should map cleanly onto this existing form's required fields, with the publication workflow prompting for whatever this form requires that the private project doesn't already have (Project Image, Client Company Logo, Key Challenges, Project Solution, Project Outcome, Tech Stack, Platform, Budget — matching the list already given in §20).

## A.2 Existing Public Project Detail Page

Example: "Mobile App Development for Digital Media Agency" by Konstant Infosolutions Pvt Ltd, client Gravity77 Pty Ltd.

Layout, top to bottom:

* Status badges (e.g. **Endorsed**, **Completed**) + bookmark action
* Project title + Services Covered tag(s)
* Hero project image with platform badges (iOS/Android)
* Meta row: Industry, Duration, Budget, Start Date, Team Size, Engagement Model
* **Project Capability Score (PCS)** panel — score/100, qualitative label (e.g. "Strong"), explanatory copy, "Learn more about PCS" link, "See PCS Breakdown" action
* Client name + country
* **Project Summary**
* **Key Challenges**
* **Project Deliverables** (bulleted list)
* **Project Solution** (highlighted block)
* **Project Outcome** (bulleted list)
* **Platforms** and **Tech Stack**
* **Client Endorsement** block: Overall Review Rating (large, e.g. "5★"), sub-ratings for Timeliness, Cost Rating, Willing to Refer, Quality of Deliverables (each 1–5 stars), a written quote, endorser name/title, submission date, and a disclosure note ("This endorsement is based on publicly available client feedback from external review sources.")
* **More Projects by [Vendor]** — sibling project cards with status badges, budget/duration/team size, services covered, and each card's own PCS score
* Right rail: **Project by [Vendor]** card (logo, HQ + timezone, two rating badges, "View Company Profile"), then **Similar projects** (cards with PCS scores)

Implication for §3.4/§21: this is the exact page any published Private Project lands on. The proposed **"Verified Delivery Performance"** block (§21 — Releases Reviewed / Average Client Rating / Client Satisfaction %) should be designed as an additional module on this page, positioned near the existing Client Endorsement block but visually distinct from it, since Release Evaluations and Project Endorsements are different trust signals (§22).
