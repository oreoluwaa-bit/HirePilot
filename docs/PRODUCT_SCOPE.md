# Product scope

## Vision
HirePilot is a career-independent job discovery and application operations platform. A user configures a personal job agent, and the system finds suitable vacancies, evaluates fit and eligibility, prepares application materials, and helps manage the application lifecycle.

## Supported career families
The product must not be limited to technology roles. Initial taxonomy includes technology, administration, customer service, finance, healthcare, engineering, education, marketing, sales, human resources, operations, legal, hospitality, logistics, creative work, and custom job titles.

## Core user journey
1. Create or edit a candidate profile.
2. Upload a CV and review extracted facts.
3. Configure career targets, locations, remote/hybrid/onsite preference, experience, salary, contract type, and countries of eligibility.
4. Discover jobs from permitted public feeds, APIs, and employer ATS boards.
5. Deduplicate jobs and evaluate hard eligibility separately from suitability.
6. Rank jobs against the candidate's verified profile.
7. Tailor a CV and cover letter without adding unsupported claims.
8. Queue an application for approval or use an explicitly enabled, permitted automatic mode.
9. Submit through an authorised integration or provide a guided handoff to the employer's application page.
10. Track confirmed status changes and outcomes.

## MVP acceptance criteria
- Ingest real vacancies from at least three supported sources.
- Preserve source, canonical job URL, employer, location, description, and available publication date.
- Deduplicate repeated vacancies.
- Mark remote country restrictions and unresolved eligibility transparently.
- Persist jobs and candidate profiles in D1.
- Display source freshness and ingestion run outcomes.
- Support reviewable candidate-job matches.
- Keep a human approval step before external application submission by default.
- Log workflow runs, errors, retries, and timestamps.

## Trust and safety requirements
- A match score is not proof of eligibility.
- Do not infer qualifications, work history, or personal details absent from the candidate's approved profile.
- Do not invent vacancies, dates, employer details, or application outcomes.
- Prevent duplicate submissions using stable application/job identifiers.
- Never submit sensitive or legally significant answers without explicit user review.
- Respect source terms, rate limits, robots directives where applicable, and employer application restrictions.
- Use secrets management for API keys and credentials.

## Out of scope for the first milestone
- Guaranteed application submission to every job board.
- Unauthorised scraping of sites that prohibit it.
- Automatic answers to sensitive declarations.
- Claims of live automation before source connectors and workflow runs are implemented and verified.
