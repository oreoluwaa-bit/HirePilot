import type { Env, NormalizedJob } from "./types";
import { configuredSources, fetchSource } from "./sources";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const makeId = () => crypto.randomUUID();

async function recordJob(db: D1Database, sourceId: string, job: NormalizedJob) {
  const id = sourceId + ":" + job.sourceJobId;
  const existing = await db.prepare("SELECT id FROM jobs WHERE id = ?").bind(id).first<{ id: string }>();
  await db.prepare(
    "INSERT INTO jobs (id, source_id, source_job_id, title, company, location, workplace_type, employment_type, department, team, description, description_html, job_url, apply_url, published_at, updated_at_source, country_code, raw_json, first_seen_at, last_seen_at, is_active) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1) " +
    "ON CONFLICT(source_id, source_job_id) DO UPDATE SET title=excluded.title, company=excluded.company, location=excluded.location, workplace_type=excluded.workplace_type, employment_type=excluded.employment_type, department=excluded.department, team=excluded.team, description=excluded.description, description_html=excluded.description_html, job_url=excluded.job_url, apply_url=excluded.apply_url, published_at=excluded.published_at, updated_at_source=excluded.updated_at_source, country_code=excluded.country_code, raw_json=excluded.raw_json, last_seen_at=CURRENT_TIMESTAMP, is_active=1"
  ).bind(
    id, sourceId, job.sourceJobId, job.title, job.company, job.location, job.workplaceType,
    job.employmentType, job.department, job.team, job.description, job.descriptionHtml,
    job.jobUrl, job.applyUrl, job.publishedAt, job.updatedAtSource, job.countryCode,
    JSON.stringify(job.raw),
  ).run();
  return existing ? "updated" : "inserted";
}

async function runDiscovery(env: Env, triggerType: string) {
  const started = Date.now();
  const runId = makeId();
  const startedAt = new Date().toISOString();
  const sources = configuredSources(env);
  const errors: Array<{ provider: string; board: string; error: string }> = [];
  let fetched = 0, inserted = 0, updated = 0, duplicates = 0, checked = 0;

  await env.DB.prepare("INSERT INTO discovery_runs (id, trigger_type, status, started_at) VALUES (?, ?, 'running', ?)")
    .bind(runId, triggerType, startedAt).run();

  for (const source of sources) {
    checked++;
    const sourceId = source.provider + ":" + source.boardKey;
    await env.DB.prepare("INSERT INTO job_sources (id, provider, board_key, display_name, is_enabled) VALUES (?, ?, ?, ?, 1) ON CONFLICT(provider, board_key) DO UPDATE SET display_name=excluded.display_name, is_enabled=1")
      .bind(sourceId, source.provider, source.boardKey, source.displayName).run();
    try {
      const result = await fetchSource(source);
      fetched += result.jobs.length;
      for (const job of result.jobs) {
        const outcome = await recordJob(env.DB, sourceId, job);
        if (outcome === "inserted") inserted++;
        else { updated++; duplicates++; }
      }
      await env.DB.prepare("UPDATE job_sources SET last_checked_at=?, last_success_at=?, last_error=NULL WHERE id=?")
        .bind(new Date().toISOString(), new Date().toISOString(), sourceId).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown source error";
      errors.push({ provider: source.provider, board: source.boardKey, error: message });
      await env.DB.prepare("UPDATE job_sources SET last_checked_at=?, last_error=? WHERE id=?")
        .bind(new Date().toISOString(), message, sourceId).run();
    }
  }

  const status = errors.length === 0 ? (checked === 0 ? "failed" : "succeeded") : (checked > errors.length ? "partial" : "failed");
  const duration = Date.now() - started;
  await env.DB.prepare("UPDATE discovery_runs SET status=?, completed_at=?, sources_checked=?, fetched_count=?, inserted_count=?, updated_count=?, duplicate_count=?, error_count=?, errors_json=?, duration_ms=? WHERE id=?")
    .bind(status, new Date().toISOString(), checked, fetched, inserted, updated, duplicates, errors.length, JSON.stringify(errors), duration, runId).run();

  return { runId, status, sourcesChecked: checked, fetched, inserted, updated, duplicates, errors, durationMs: duration };
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "HirePilot API", environment: env.APP_ENV ?? "unknown", timestamp: new Date().toISOString() });
  }
  if (url.pathname === "/api/jobs" && request.method === "GET") {
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);
    const search = (url.searchParams.get("q") ?? "").trim();
    const workplace = url.searchParams.get("workplace");
    const conditions = ["is_active = 1"];
    const values: unknown[] = [];
    if (search) {
      conditions.push("(title LIKE ? OR company LIKE ? OR description LIKE ?)");
      values.push("%" + search + "%", "%" + search + "%", "%" + search + "%");
    }
    if (workplace && ["remote", "hybrid", "on-site"].includes(workplace)) {
      conditions.push("workplace_type = ?");
      values.push(workplace);
    }
    const rows = await env.DB.prepare(
      "SELECT id, source_id, title, company, location, workplace_type, employment_type, department, team, description, job_url, apply_url, published_at, country_code, first_seen_at, last_seen_at FROM jobs WHERE " +
      conditions.join(" AND ") + " ORDER BY COALESCE(published_at, first_seen_at) DESC LIMIT ?"
    ).bind(...values, limit).all();
    return json({ jobs: rows.results, count: rows.results.length });
  }
  if (url.pathname === "/api/discovery/run" && request.method === "POST") {
    if (!env.HIREPILOT_ADMIN_TOKEN) return json({ error: "Discovery trigger is not configured. Add HIREPILOT_ADMIN_TOKEN as a Worker secret." }, 503);
    if (request.headers.get("Authorization") !== "Bearer " + env.HIREPILOT_ADMIN_TOKEN) return json({ error: "Unauthorized" }, 401);
    const result = await runDiscovery(env, "manual");
    return json(result, result.status === "failed" ? 502 : 200);
  }
  if (url.pathname === "/api/discovery/runs" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM discovery_runs ORDER BY started_at DESC LIMIT 20").all();
    return json({ runs: rows.results });
  }
  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await handleApi(request, env); }
      catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return json({ error: message }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDiscovery(env, "scheduled"));
  },
};
