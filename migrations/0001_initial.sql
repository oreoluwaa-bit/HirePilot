PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS job_sources (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('greenhouse', 'lever', 'ashby')),
  board_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  last_checked_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, board_key)
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES job_sources(id) ON DELETE CASCADE,
  source_job_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  workplace_type TEXT NOT NULL DEFAULT 'unknown',
  employment_type TEXT,
  department TEXT,
  team TEXT,
  description TEXT,
  description_html TEXT,
  job_url TEXT NOT NULL,
  apply_url TEXT,
  published_at TEXT,
  updated_at_source TEXT,
  country_code TEXT,
  raw_json TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(source_id, source_job_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_active_published ON jobs(is_active, published_at);
CREATE INDEX IF NOT EXISTS idx_jobs_company_title ON jobs(company, title);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source_id);

CREATE TABLE IF NOT EXISTS discovery_runs (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  sources_checked INTEGER NOT NULL DEFAULT 0,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT,
  duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
