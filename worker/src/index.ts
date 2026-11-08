export interface Env {
  DB: D1Database;
  ADMIN_API_TOKEN: string;
  ATS_BOARDS?: string;
  ALLOWED_ORIGIN?: string;
}

type SourceName = "arbeitnow" | "greenhouse" | "lever" | "ashby";
type NormalizedJob = {
  source: SourceName;
  externalId: string;
  title: string;
  company: string;
  location: string;
  workplace: "remote" | "hybrid" | "onsite" | "unknown";
  employmentType: string | null;
  category: string | null;
  description: string;
  publishedAt: string | null;
  canonicalUrl: string;
  sourceUrl: string;
  raw: unknown;
};

type BoardConfig = {
  greenhouse?: string[];
  lever?: string[];
  ashby?: string[];
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, "access-control-allow-origin": origin, "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET, POST, OPTIONS" },
  });
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#39;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim();
}

function safeDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function workplace(remote: unknown, location = "", description = ""): NormalizedJob["workplace"] {
  if (remote === true) return "remote";
  const text = (String(remote ?? "") + " " + location + " " + description.slice(0, 1200)).toLowerCase();
  if (/\b(hybrid|partly remote|partially remote)\b/.test(text)) return "hybrid";
  if (/\b(remote|work from home|work-from-home|distributed|anywhere)\b/.test(text)) return "remote";
  if (location) return "onsite";
  return "unknown";
}

function canonicalize(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "source"].forEach((key) => url.searchParams.delete(key));
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim();
  }
}

function makeJob(input: Omit<NormalizedJob, "canonicalUrl"> & { canonicalUrl?: string }): NormalizedJob | null {
  if (!input.title || !input.company || !input.sourceUrl) return null;
  return {
    ...input,
    canonicalUrl: canonicalize(input.canonicalUrl || input.sourceUrl),
    title: cleanText(input.title),
    company: cleanText(input.company),
    location: cleanText(input.location || "Not specified"),
    description: cleanText(input.description).slice(0, 30000),
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const response = await fetch(url, { ...init, headers: { accept: "application/json", "user-agent": "HirePilotJobDiscovery/0.1", ...(init?.headers || {}) } });
  if (!response.ok) throw new Error("HTTP " + response.status + " from " + new URL(url).hostname);
  return response.json();
}

async function arbeitnowJobs(): Promise<NormalizedJob[]> {
  const payload = await fetchJson("https://www.arbeitnow.com/api/job-board-api?page=1");
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((item: any) => {
    const url = String(item.url || "");
    return makeJob({
      source: "arbeitnow",
      externalId: String(item.slug || url),
      title: String(item.title || ""),
      company: String(item.company_name || "Unknown employer"),
      location: String(item.location || "Not specified"),
      workplace: workplace(item.remote, String(item.location || ""), String(item.description || "")),
      employmentType: Array.isArray(item.job_types) ? item.job_types.join(", ") : null,
      category: Array.isArray(item.tags) ? item.tags.join(", ") : null,
      description: String(item.description || ""),
      publishedAt: safeDate(item.created_at),
      sourceUrl: url,
      raw: item,
    });
  }).filter(Boolean) as NormalizedJob[];
}

async function greenhouseJobs(board: string): Promise<NormalizedJob[]> {
  const payload = await fetchJson("https://boards-api.greenhouse.io/v1/boards/" + encodeURIComponent(board) + "/jobs?content=true");
  const rows = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return rows.map((item: any) => {
    const url = String(item.absolute_url || "");
    const location = String(item.location?.name || item.offices?.map((office: any) => office.location || office.name).join(", ") || "Not specified");
    return makeJob({
      source: "greenhouse",
      externalId: String(item.id),
      title: String(item.title || ""),
      company: String(item.company_name || board),
      location,
      workplace: workplace(null, location, String(item.content || "")),
      employmentType: null,
      category: item.departments?.map((department: any) => department.name).join(", ") || null,
      description: String(item.content || ""),
      publishedAt: safeDate(item.first_published || item.updated_at),
      sourceUrl: url,
      raw: item,
    });
  }).filter(Boolean) as NormalizedJob[];
}

async function leverJobs(site: string): Promise<NormalizedJob[]> {
  const payload = await fetchJson("https://api.lever.co/v0/postings/" + encodeURIComponent(site) + "?mode=json");
  const rows = Array.isArray(payload) ? payload : [];
  return rows.map((item: any) => {
    const categories = item.categories || {};
    const location = String(categories.location || "Not specified");
    const description = [item.description, item.descriptionPlain, item.additional, item.additionalPlain].filter(Boolean).join(" ");
    return makeJob({
      source: "lever",
      externalId: String(item.id || item.hostedUrl || ""),
      title: String(item.text || ""),
      company: String(item.company || site),
      location,
      workplace: workplace(item.workplaceType, location, description),
      employmentType: categories.commitment || null,
      category: categories.team || categories.department || null,
      description,
      publishedAt: safeDate(item.createdAt ? new Date(item.createdAt).toISOString() : null),
      sourceUrl: String(item.hostedUrl || item.applyUrl || ""),
      raw: item,
    });
  }).filter(Boolean) as NormalizedJob[];
}

async function ashbyJobs(board: string): Promise<NormalizedJob[]> {
  const payload = await fetchJson("https://api.ashbyhq.com/posting-api/job-board/" + encodeURIComponent(board), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ listedOnly: true }),
  });
  const rows = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return rows.map((item: any) => {
    const location = String(item.location || item.locationName || "Not specified");
    const description = String(item.descriptionPlain || item.descriptionHtml || "");
    return makeJob({
      source: "ashby",
      externalId: String(item.id || item.jobUrl || ""),
      title: String(item.title || ""),
      company: String(item.companyName || board),
      location,
      workplace: workplace(item.isRemote, location, description),
      employmentType: item.employmentType || null,
      category: item.department || item.team || null,
      description,
      publishedAt: safeDate(item.publishedAt),
      sourceUrl: String(item.jobUrl || ""),
      raw: item,
    });
  }).filter(Boolean) as NormalizedJob[];
}

function parseBoards(raw?: string): BoardConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return {
      greenhouse: Array.isArray(parsed.greenhouse) ? parsed.greenhouse.filter((x: unknown) => typeof x === "string") : [],
      lever: Array.isArray(parsed.lever) ? parsed.lever.filter((x: unknown) => typeof x === "string") : [],
      ashby: Array.isArray(parsed.ashby) ? parsed.ashby.filter((x: unknown) => typeof x === "string") : [],
    };
  } catch {
    throw new Error("ATS_BOARDS must be valid JSON with greenhouse, lever and ashby arrays.");
  }
}

async function discover(env: Env) {
  const started = Date.now();
  const results: { source: string; fetched: number; error?: string }[] = [];
  const jobs: NormalizedJob[] = [];
  const boards = parseBoards(env.ATS_BOARDS);
  const tasks: { name: string; run: () => Promise<NormalizedJob[]> }[] = [
    { name: "arbeitnow", run: arbeitnowJobs },
    ...(boards.greenhouse || []).map((board) => ({ name: "greenhouse:" + board, run: () => greenhouseJobs(board) })),
    ...(boards.lever || []).map((site) => ({ name: "lever:" + site, run: () => leverJobs(site) })),
    ...(boards.ashby || []).map((board) => ({ name: "ashby:" + board, run: () => ashbyJobs(board) })),
  ];

  const settled = await Promise.allSettled(tasks.map((task) => task.run()));
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
      results.push({ source: tasks[index].name, fetched: result.value.length });
    } else {
      results.push({ source: tasks[index].name, fetched: 0, error: result.reason instanceof Error ? result.reason.message : "Source request failed" });
    }
  });

  const existing = await env.DB.prepare("SELECT canonical_url FROM jobs WHERE is_active = 1").all<{ canonical_url: string }>();
  const knownUrls = new Set((existing.results || []).map((row) => row.canonical_url));
  const seenThisRun = new Set<string>();
  let inserted = 0;
  let updated = 0;
  let duplicates = 0;
  const now = new Date().toISOString();

  for (const job of jobs) {
    if (seenThisRun.has(job.canonicalUrl)) { duplicates++; continue; }
    seenThisRun.add(job.canonicalUrl);
    const wasKnown = knownUrls.has(job.canonicalUrl);
    await env.DB.prepare(`INSERT INTO jobs
      (source, external_id, title, company, location, workplace, employment_type, category, description, published_at, canonical_url, source_url, raw_json, first_seen_at, last_seen_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(source, external_id) DO UPDATE SET
      title=excluded.title, company=excluded.company, location=excluded.location,
      workplace=excluded.workplace, employment_type=excluded.employment_type,
      category=excluded.category, description=excluded.description,
      published_at=COALESCE(excluded.published_at, jobs.published_at),
      canonical_url=excluded.canonical_url, source_url=excluded.source_url,
      raw_json=excluded.raw_json, last_seen_at=excluded.last_seen_at, is_active=1`)
      .bind(job.source, job.externalId, job.title, job.company, job.location, job.workplace, job.employmentType, job.category, job.description, job.publishedAt, job.canonicalUrl, job.sourceUrl, JSON.stringify(job.raw), now, now)
      .run();
    if (wasKnown) updated++; else inserted++;
    knownUrls.add(job.canonicalUrl);
  }

  const errors = results.filter((item) => item.error).length;
  const durationMs = Date.now() - started;
  const runId = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO discovery_runs (id, started_at, completed_at, sources_checked, fetched_count, inserted_count, updated_count, duplicate_count, error_count, duration_ms, source_results)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(runId, new Date(started).toISOString(), now, tasks.length, jobs.length, inserted, updated, duplicates, errors, durationMs, JSON.stringify(results))
    .run();

  return { runId, sourcesChecked: tasks.length, fetched: jobs.length, inserted, updated, duplicates, errors, durationMs, sources: results };
}

async function listJobs(request: Request, env: Env, origin: string) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const workplaceFilter = url.searchParams.get("workplace");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const clauses = ["is_active = 1"];
  const values: (string | number)[] = [];
  if (search) {
    clauses.push("(title LIKE ? OR company LIKE ? OR description LIKE ? OR category LIKE ?)");
    const term = "%" + search + "%";
    values.push(term, term, term, term);
  }
  if (workplaceFilter && ["remote", "hybrid", "onsite", "unknown"].includes(workplaceFilter)) {
    clauses.push("workplace = ?");
    values.push(workplaceFilter);
  }
  const where = clauses.join(" AND ");
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM jobs WHERE " + where).bind(...values).first<{ total: number }>();
  const rows = await env.DB.prepare("SELECT id, source, title, company, location, workplace, employment_type, category, description, published_at, source_url, first_seen_at FROM jobs WHERE " + where + " ORDER BY COALESCE(published_at, first_seen_at) DESC LIMIT ? OFFSET ?")
    .bind(...values, limit, offset).all();
  return json({ jobs: rows.results || [], total: count?.total || 0, limit, offset }, 200, origin);
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(discover(env));
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || "*";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": origin, "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET, POST, OPTIONS" } });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        const db = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
        return json({ ok: true, service: "HirePilot Discovery API", database: db?.ok === 1, timestamp: new Date().toISOString() }, 200, origin);
      }
      if (url.pathname === "/api/jobs" && request.method === "GET") return listJobs(request, env, origin);
      if (url.pathname === "/api/discovery/run" && request.method === "POST") {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!env.ADMIN_API_TOKEN || token !== env.ADMIN_API_TOKEN) return json({ error: "Unauthorized. Configure and provide the discovery API token." }, 401, origin);
        const result = await discover(env);
        return json(result, 200, origin);
      }
      if (url.pathname === "/api/discovery/latest" && request.method === "GET") {
        const latest = await env.DB.prepare("SELECT * FROM discovery_runs ORDER BY started_at DESC LIMIT 1").first();
        return json({ latest: latest || null }, 200, origin);
      }
      return json({ error: "Not found" }, 404, origin);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, 500, origin);
    }
  },
};
