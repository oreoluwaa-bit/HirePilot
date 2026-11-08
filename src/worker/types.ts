export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV?: string;
  HIREPILOT_ADMIN_TOKEN?: string;
  GREENHOUSE_BOARDS?: string;
  LEVER_SITES?: string;
  ASHBY_BOARDS?: string;
  REMOTIVE_ENABLED?: string;
  ARBEITNOW_ENABLED?: string;
}

export type Provider = "greenhouse" | "lever" | "ashby" | "remotive" | "arbeitnow";
export type WorkplaceType = "remote" | "hybrid" | "on-site" | "unknown";

export interface NormalizedJob {
  sourceJobId: string;
  title: string;
  company: string;
  location: string | null;
  workplaceType: WorkplaceType;
  employmentType: string | null;
  department: string | null;
  team: string | null;
  description: string | null;
  descriptionHtml: string | null;
  jobUrl: string;
  applyUrl: string | null;
  publishedAt: string | null;
  updatedAtSource: string | null;
  countryCode: string | null;
  raw: unknown;
}

export interface SourceConfig {
  provider: Provider;
  boardKey: string;
  displayName: string;
}
