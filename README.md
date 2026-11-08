# HirePilot

AI-powered job discovery and application automation for **all career fields**.

> The product is designed around real, traceable automation—not a static dashboard. Job discovery, matching, document preparation, approval, submission handoff, and application tracking will be connected to real services as the project develops.

## Brand
- Primary teal: `#018081`
- Pale mint: `#E1F9F4`

## Planned stack
- **Web:** React + TypeScript + Vite
- **API:** Cloudflare Workers
- **Database:** Cloudflare D1
- **File storage:** Cloudflare R2
- **Workflow engine:** Activepieces
- **AI:** Gemini API
- **Source control:** GitHub

## Product flow
1. Add a candidate profile and CV.
2. Discover real vacancies from supported job sources and employer ATS boards.
3. Deduplicate jobs and evaluate location, work arrangement, and other eligibility rules.
4. Match job requirements against the candidate's verified profile.
5. Prepare a truthful tailored CV and cover letter.
6. Request human approval when required.
7. Submit through an authorised integration or hand off to the employer's application page.
8. Track confirmed application outcomes and automation runs.

## Important product rules
- Never invent vacancies, qualifications, or application outcomes.
- Separate match score from hard eligibility checks.
- Do not silently apply twice to the same vacancy.
- Use human approval for sensitive or uncertain application answers.
- Respect source terms, rate limits, and employer application restrictions.
- Store API keys and credentials as service secrets; never commit them.

## Current status
This repository contains the initial web application scaffold and product foundation. Live job ingestion, AI processing, Activepieces workflows, and application submission are **not yet connected**. They will be implemented and tested in stages.

## Run locally
Requires Node.js 20+.

```bash
npm install
npm run dev
```
