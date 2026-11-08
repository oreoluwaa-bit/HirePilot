# Cloudflare deployment setup

HirePilot uses a separate Cloudflare Worker API and a React frontend. The Worker is configured in `worker/wrangler.toml`.

## 1. Create the D1 database
In Cloudflare Dashboard:
1. Open **Workers & Pages → D1 SQL Database**.
2. Create a database named `hirepilot-db`.
3. Copy its database ID.
4. Replace `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID` in `worker/wrangler.toml` with that ID.

The migration in `worker/migrations/0001_initial.sql` creates the jobs and discovery-run tables.

## 2. Configure Worker secrets and variables
In the `hirepilot-api` Worker settings:
- Add secret `ADMIN_API_TOKEN` with a long random value.
- Add variable `ATS_BOARDS` containing JSON, for example:
  `{"greenhouse":["your-board-token"],"lever":["your-lever-site"],"ashby":["your-ashby-board"]}`
- Set `ALLOWED_ORIGIN` to the exact deployed frontend origin rather than `*` once the frontend URL is known.

Only add employer board identifiers that you have verified. These are not API keys; they identify public employer job boards.

## 3. Deploy the Worker
Connect the GitHub repository to Cloudflare Workers or deploy from a Cloudflare-supported build environment with:
- Working directory: `worker`
- Build command: `npm install`
- Deploy command: `npm run deploy`

Apply the D1 migration before testing the API. The scheduled trigger is configured for every six hours.

## 4. Verify
- `GET https://YOUR-WORKER-DOMAIN/api/health`
- `GET https://YOUR-WORKER-DOMAIN/api/jobs`
- `GET https://YOUR-WORKER-DOMAIN/api/discovery/latest`

To trigger a manual discovery run, send a POST request to `/api/discovery/run` with `Authorization: Bearer YOUR_ADMIN_API_TOKEN`. Keep this token private. Do not paste it into GitHub or a public frontend bundle.

## Current limitations
The Worker does not yet have user authentication, candidate profiles, country eligibility scoring, or Activepieces integration. Those are separate milestones. The first version runs a six-hour scheduled ingestion and stores source-attributed job records in D1.
