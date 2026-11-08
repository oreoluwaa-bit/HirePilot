import type { NormalizedJob, Provider, SourceConfig, WorkplaceType } from "./types";

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "HirePilotJobDiscovery/0.1" },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!response.ok) throw new Error("HTTP " + response.status + " from " + new URL(url).hostname);
  return response.json();
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  return trimmed || null;
}

function workplace(value: unknown): WorkplaceType {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("remote")) return "remote";
  if (v.includes("hybrid")) return "hybrid";
  if (v.includes("onsite") || v.includes("on-site") || v.includes("on site")) return "on-site";
  return "unknown";
}

function normalizeGreenhouse(board: string, item: any): NormalizedJob {
  const location = item.location?.name ?? null;
  return {
    sourceJobId: String(item.id),
    title: item.title ?? "Untitled role",
    company: item.company_name ?? board,
    location,
    workplaceType: workplace([location, item.content].join(" ")),
    employmentType: null,
    department: item.departments?.map((d: any) => d.name).filter(Boolean).join(", ") ?? null,
    team: null,
    description: cleanText(item.content),
    descriptionHtml: item.content ?? null,
    jobUrl: item.absolute_url,
    applyUrl: item.absolute_url,
    publishedAt: item.first_published ?? null,
    updatedAtSource: item.updated_at ?? null,
    countryCode: null,
    raw: item,
  };
}

function normalizeLever(site: string, item: any): NormalizedJob {
  const location = item.categories?.allLocations?.join(", ") || item.categories?.location || null;
  return {
    sourceJobId: String(item.id),
    title: item.text ?? "Untitled role",
    company: item.company ?? site,
    location,
    workplaceType: workplace(item.workplaceType),
    employmentType: item.categories?.commitment ?? null,
    department: item.categories?.department ?? null,
    team: item.categories?.team ?? null,
    description: cleanText(item.descriptionPlain ?? item.description),
    descriptionHtml: item.description ?? null,
    jobUrl: item.hostedUrl,
    applyUrl: item.applyUrl ?? item.hostedUrl,
    publishedAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    updatedAtSource: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    countryCode: item.country ?? null,
    raw: item,
  };
}

function normalizeAshby(board: string, item: any): NormalizedJob {
  const postal = item.address?.postalAddress;
  const location = [item.location, postal?.addressCountry].filter(Boolean).join(" · ") || null;
  return {
    sourceJobId: String(item.id ?? item.jobUrl),
    title: item.title ?? "Untitled role",
    company: item.companyName ?? board,
    location,
    workplaceType: workplace(item.workplaceType ?? (item.isRemote ? "remote" : "")),
    employmentType: item.employmentType ?? null,
    department: item.department ?? null,
    team: item.team ?? null,
    description: cleanText(item.descriptionPlain ?? item.descriptionHtml),
    descriptionHtml: item.descriptionHtml ?? null,
    jobUrl: item.jobUrl,
    applyUrl: item.applyUrl ?? item.jobUrl,
    publishedAt: item.publishedAt ?? null,
    updatedAtSource: null,
    countryCode: postal?.addressCountry ?? null,
    raw: item,
  };
}


function normalizeRemotive(item: any): NormalizedJob {
  return {
    sourceJobId: String(item.id),
    title: item.title ?? "Untitled role",
    company: item.company_name ?? "Unknown company",
    location: item.candidate_required_location ?? "Remote location not specified",
    workplaceType: "remote",
    employmentType: item.job_type ?? null,
    department: item.category ?? null,
    team: null,
    description: cleanText(item.description),
    descriptionHtml: item.description ?? null,
    jobUrl: item.url,
    applyUrl: item.url,
    publishedAt: item.publication_date ?? null,
    updatedAtSource: null,
    countryCode: null,
    raw: item,
  };
}

function normalizeArbeitnow(item: any): NormalizedJob {
  return {
    sourceJobId: String(item.slug ?? item.id ?? item.url),
    title: item.title ?? "Untitled role",
    company: item.company_name ?? item.company ?? "Unknown company",
    location: item.location ?? null,
    workplaceType: item.remote === true ? "remote" : workplace(item.remote),
    employmentType: item.job_types?.join(", ") ?? item.job_type ?? null,
    department: item.category ?? item.categories?.join(", ") ?? null,
    team: null,
    description: cleanText(item.description),
    descriptionHtml: item.description ?? null,
    jobUrl: item.url,
    applyUrl: item.url,
    publishedAt: item.created_at ?? item.createdAt ?? item.date ?? null,
    updatedAtSource: null,
    countryCode: null,
    raw: item,
  };
}

export async function fetchSource(source: SourceConfig): Promise<{ source: SourceConfig; jobs: NormalizedJob[] }> {
  if (source.provider === "greenhouse") {
    const url = "https://boards-api.greenhouse.io/v1/boards/" + encodeURIComponent(source.boardKey) + "/jobs?content=true";
    const data = await getJson(url);
    return { source, jobs: (data.jobs ?? []).filter((x: any) => x.absolute_url).map((x: any) => normalizeGreenhouse(source.boardKey, x)) };
  }
  if (source.provider === "lever") {
    const url = "https://api.lever.co/v0/postings/" + encodeURIComponent(source.boardKey) + "?mode=json&limit=100";
    const data = await getJson(url);
    return { source, jobs: (Array.isArray(data) ? data : []).filter((x: any) => x.hostedUrl).map((x: any) => normalizeLever(source.boardKey, x)) };
  }
  if (source.provider === "ashby") {
    const url = "https://api.ashbyhq.com/posting-api/job-board/" + encodeURIComponent(source.boardKey);
    const data = await getJson(url);
    return { source, jobs: (data.jobs ?? []).filter((x: any) => x.isListed !== false && x.jobUrl).map((x: any) => normalizeAshby(source.boardKey, x)) };
  }
  if (source.provider === "remotive") {
    const data = await getJson("https://remotive.com/api/remote-jobs?limit=500");
    return { source, jobs: (data.jobs ?? []).filter((x: any) => x.url).map(normalizeRemotive) };
  }
  if (source.provider === "arbeitnow") {
    const data = await getJson("https://www.arbeitnow.com/api/job-board-api");
    const records = Array.isArray(data) ? data : (data.data ?? data.jobs ?? []);
    return { source, jobs: records.filter((x: any) => x.url).map(normalizeArbeitnow) };
  }
  const unreachable: never = source.provider as never;
  throw new Error("Unsupported provider: " + String(unreachable));
}

export function configuredSources(env: { GREENHOUSE_BOARDS?: string; LEVER_SITES?: string; ASHBY_BOARDS?: string; REMOTIVE_ENABLED?: string; ARBEITNOW_ENABLED?: string }): SourceConfig[] {
  const parse = (value: string | undefined, provider: Provider) =>
    (value ?? "").split(",").map((x) => x.trim()).filter(Boolean).map((boardKey) => ({
      provider,
      boardKey,
      displayName: boardKey,
    }));
  return [
    ...parse(env.GREENHOUSE_BOARDS, "greenhouse"),
    ...parse(env.LEVER_SITES, "lever"),
    ...parse(env.ASHBY_BOARDS, "ashby"),
    ...(env.REMOTIVE_ENABLED === "true" ? [{ provider: "remotive" as Provider, boardKey: "public", displayName: "Remotive" }] : []),
    ...(env.ARBEITNOW_ENABLED === "true" ? [{ provider: "arbeitnow" as Provider, boardKey: "public", displayName: "Arbeitnow" }] : []),
  ];
}
