# Implementation roadmap

## Phase 0 — Foundation
- [x] Create GitHub repository.
- [x] Add React + TypeScript + Vite scaffold.
- [x] Establish HirePilot brand palette.
- [x] Add initial dashboard shell and responsive layout.
- [x] Document product scope, architecture, and roadmap.
- [ ] Verify a production build in CI or Cloudflare Pages.
- [ ] Connect Cloudflare deployment.

## Phase 1 — Real job discovery
- [ ] Define D1 schema and migrations.
- [ ] Implement Worker API foundation.
- [ ] Connect three permitted real job sources.
- [ ] Normalise jobs and preserve source attribution.
- [ ] Deduplicate by source ID and canonical URL.
- [ ] Add eligibility and remote-country checks.
- [ ] Persist and display real vacancies.
- [ ] Add scheduled refresh and ingestion run logs.

## Phase 2 — Candidate profile and matching
- [ ] CV upload to private R2 storage.
- [ ] Extract candidate profile facts for user review.
- [ ] Support all career families and custom titles.
- [ ] Add configurable preferences and hard eligibility rules.
- [ ] Implement explainable match results.
- [ ] Keep eligibility status distinct from match score.

## Phase 3 — Document preparation
- [ ] Generate job-specific CV drafts from verified facts.
- [ ] Generate cover-letter drafts.
- [ ] Show change summaries and allow editing.
- [ ] Export final documents.
- [ ] Record model and prompt metadata for traceability.

## Phase 4 — Workflow automation
- [ ] Connect Activepieces.
- [ ] Implement discovery, matching, document, approval, and tracking flows.
- [ ] Add run logs, retries, error states, and idempotency.
- [ ] Add scheduled Personal Job Agent controls.
- [ ] Verify each workflow against real test records.

## Phase 5 — Applications and multi-user readiness
- [ ] Build approval queue.
- [ ] Add authorised ATS submission integrations where possible.
- [ ] Add guided application handoff where direct submission is unavailable.
- [ ] Track confirmed submissions and outcomes.
- [ ] Add authentication, tenant isolation, audit logs, and privacy controls.
