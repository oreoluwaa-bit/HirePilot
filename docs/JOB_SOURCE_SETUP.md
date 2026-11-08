# Job source setup

HirePilot's first discovery adapters use public job-board endpoints. They retrieve vacancies for specific employer boards; they are not a global search API. Configure board identifiers for employers you want to monitor.

## Greenhouse
Public endpoint: GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
Set the comma-separated Worker variable GREENHOUSE_BOARDS.
Public GET endpoints do not require authentication. Application submission requires employer API credentials and is not part of this milestone.
Official docs: https://docs.greenhouse.io/job-board

## Lever
Public endpoint: GET https://api.lever.co/v0/postings/{site}?mode=json&limit=100
Set the comma-separated Worker variable LEVER_SITES.
The postings API returns published vacancies and hosted application URLs.
Official docs: https://github.com/lever/postings-api

## Ashby
Public endpoint: GET https://api.ashbyhq.com/posting-api/job-board/{JOB_BOARD_NAME}
Set the comma-separated Worker variable ASHBY_BOARDS.
The response can include workplace type, employment type, and publication timestamp.
Official docs: https://developers.ashbyhq.com/docs/public-job-posting-api

## Cloudflare setup
1. Create a D1 database named hirepilot-db.
2. Apply migrations/0001_initial.sql to that database.
3. Copy the generated database ID into wrangler.toml.
4. Set GREENHOUSE_BOARDS, LEVER_SITES, and ASHBY_BOARDS as Worker variables with board identifiers you have verified.
5. Add HIREPILOT_ADMIN_TOKEN as a Worker secret, not a plain text variable.
6. Build the web app and deploy the Worker with its static assets.
7. Trigger POST /api/discovery/run with an Authorization bearer token.
8. Check GET /api/jobs and GET /api/discovery/runs.

## Scheduled refresh
A Cloudflare cron trigger can be added after deployment. The Worker exports a scheduled handler that runs the same ingestion pipeline.

## Limitations
- Board identifiers must be configured; adapters do not automatically discover every employer board.
- A blank board list means no source is configured and no vacancies will be ingested.
- Greenhouse updated_at is not necessarily first-publication date; HirePilot preserves first_published only when provided.
- Lever and Ashby fields vary by employer and may be absent. Missing values remain null rather than being guessed.
- Remote does not automatically mean worldwide. Country eligibility will be evaluated in a later matching phase.
- These discovery adapters do not submit applications.
