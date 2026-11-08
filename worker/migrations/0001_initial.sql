PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Not specified',
  workplace TEXT NOT NULL DEFAULT 'unknown' CHECK (workplace IN ('remote', 'hybrid', 'onsite', 'unknown')),
  employment_type TEXT,
  category TEXT,
  description TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  canonical_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  raw_json TEXT NOT NULL DEFAULT '{}',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_active_published ON jobs(is_active, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_title_company ON jobs(title, company);
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_url ON jobs(canonical_url);
CREATE INDEX IF NOT EXISTS idx_jobs_workplace ON jobs(workplace);

CREATE TABLE IF NOT EXISTS discovery_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  sources_checked INTEGER NOT NULL DEFAULT 0,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  source_results TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_discovery_runs_started ON discovery_runs(started_at DESC);
