# HirePilot Discovery Worker

This Cloudflare Worker provides the first real job-ingestion API.

## Routes
- `GET /api/health` — confirms Worker and D1 connectivity.
- `GET /api/jobs?q=analyst&workplace=remote&limit=50` — lists stored vacancies.
- `GET /api/discovery/latest` — latest ingestion run summary.
- `POST /api/discovery/run` — runs configured source connectors. Requires `Authorization: Bearer <ADMIN_API_TOKEN>`.

## Sources
- Arbeitnow public Job Board API (page 1 in this first iteration).
- Greenhouse public Job Board API, for each configured board token.
- Lever public Postings API, for each configured site.
- Ashby public Job Posting API, for each configured job board.

The ATS sources require a known employer board identifier. HirePilot does not claim to search every employer automatically. Board identifiers must be curated and checked. Arbeitnow currently has strong European coverage, so it should not be treated as a global or Nigeria-focused source.

## Cloudflare setup
1. Create a D1 database named `hirepilot-db` in Cloudflare.
2. Copy its database ID into `wrangler.toml`.
3. Bind it to the Worker as `DB`.
4. Apply `migrations/0001_initial.sql` using the D1 migrations workflow.
5. Add Worker secret `ADMIN_API_TOKEN`.
6. Add Worker variable `ATS_BOARDS` as JSON, for example:
   `{"greenhouse":["example-board"],"lever":["example-site"],"ashby":["example-board"]}`
7. Deploy the Worker.

Do not put the admin token in Git or a public frontend bundle.

## Data integrity
- Source URLs and source identifiers are retained.
- Jobs are upserted by source + external ID.
- Repeated canonical URLs in the same run are counted as duplicates.
- Source errors are recorded per source; one failed connector does not discard successful results.
- The API does not claim a vacancy is eligible for a candidate. Country eligibility and candidate matching are a later layer.
- Application submission is not implemented in this milestone.

## Limitations in v0.1
- Arbeitnow fetches the first page only.
- No employer board discovery crawler is included.
- ATS boards must be configured manually.
- Remote classification is heuristic and must be confirmed from the employer listing before an application is recommended.
- Authentication is a single admin token for prototype operations; production requires user authentication and tenant isolation.
