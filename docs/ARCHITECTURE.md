# Architecture

## High-level design

```text
React + TypeScript web app
          |
          v
Cloudflare Worker API
   |       |        |
   v       v        v
 D1       R2     Gemini API
   |
   v
Activepieces workflows
   |
   +--> Job source connectors / ATS feeds
   +--> Matching and document preparation
   +--> Approval queue and application handoff
   +--> Status tracking and run logs
```

## Responsibilities

### Web application
- Candidate onboarding and profile management.
- Job discovery, filters, match review, document review, and application tracking.
- Automation run history and clear connection state.
- Never present sample records as live vacancies.

### Cloudflare Workers API
- Authenticated application API.
- Input validation and business rules.
- D1 reads/writes and R2 upload coordination.
- Secure communication with AI and workflow services.
- Idempotency checks for ingestion and application events.

### D1
Planned entities include users, candidate_profiles, candidate_preferences, candidate_documents, job_sources, employer_boards, jobs, job_matches, generated_documents, applications, workflow_runs, and audit_events.

### R2
Store CV uploads and generated application documents with private access and short-lived authorised download links. Avoid public buckets for personal documents.

### Activepieces
Orchestrate scheduled discovery, source ingestion, deduplication, analysis, matching, document preparation, approval notifications, and tracking. Each workflow should call authenticated Worker endpoints and report run IDs/status back to HirePilot.

### Gemini
Use for structured extraction, job requirement analysis, semantic matching assistance, and document drafting. Validate structured output and ground every generated claim in approved candidate facts.

## Job source strategy
Prefer official APIs, public ATS job-board endpoints, and feeds with permitted access. Initial connector candidates include Greenhouse, Lever, Ashby, Remotive, Arbeitnow, and Remote OK. Confirm current API documentation, access requirements, terms, and rate limits before implementation. Some aggregators require API credentials.

## Application submission strategy
Use an official employer/ATS submission API only where available and authorised. Otherwise, provide a secure guided handoff to the employer application page. Browser automation must be evaluated per target site and must not bypass access controls, CAPTCHAs, or site restrictions.

## Environment and secrets
- Keep credentials out of Git.
- Use Cloudflare Worker secrets and Activepieces connections.
- Use separate development and production environments.
- Minimise personal data retention and restrict access to CVs and application records.
