import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, CheckCircle2, CircleAlert, Database, Globe2, KeyRound, Play, RefreshCw, Search } from "lucide-react";

type ApiJob = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  workplace: string;
  employment_type: string | null;
  category: string | null;
  description: string;
  published_at: string | null;
  source_url: string;
  first_seen_at: string;
};

type RunResult = {
  runId: string;
  sourcesChecked: number;
  fetched: number;
  inserted: number;
  updated: number;
  duplicates: number;
  errors: number;
  durationMs: number;
  sources: { source: string; fetched: number; error?: string }[];
};

const storedApi = () => localStorage.getItem("hirepilot_api_url") || window.location.origin;

export default function DiscoveryPage() {
  const [apiUrl, setApiUrl] = useState(storedApi);
  const [token, setToken] = useState("");
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [total, setTotal] = useState(0);
  const [health, setHealth] = useState<"checking" | "connected" | "offline">("checking");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [run, setRun] = useState<RunResult | null>(null);

  const base = apiUrl.trim().replace(/\/$/, "");
  const load = async () => {
    setBusy(true);
    setMessage("");
    try {
      const [healthResponse, jobsResponse] = await Promise.all([
        fetch(base + "/api/health"),
        fetch(base + "/api/jobs?limit=50" + (query ? "&q=" + encodeURIComponent(query) : "")),
      ]);
      if (!healthResponse.ok || !jobsResponse.ok) throw new Error("API returned HTTP " + (!healthResponse.ok ? healthResponse.status : jobsResponse.status));
      const healthData = await healthResponse.json() as { database?: boolean };
      const jobData = await jobsResponse.json() as { jobs?: ApiJob[]; total?: number };
      setHealth(healthData.database ? "connected" : "offline");
      setJobs(jobData.jobs || []);
      setTotal(jobData.total || 0);
    } catch (error) {
      setHealth("offline");
      setJobs([]);
      setTotal(0);
      setMessage(error instanceof Error ? error.message : "Could not reach the HirePilot API.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const saveEndpoint = () => {
    localStorage.setItem("hirepilot_api_url", base);
    setMessage("API endpoint saved in this browser.");
    void load();
  };

  const runDiscovery = async () => {
    if (!token.trim()) {
      setMessage("Enter the ADMIN_API_TOKEN you configured in your Cloudflare Worker. It is used for this request only.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(base + "/api/discovery/run", {
        method: "POST",
        headers: { authorization: "Bearer " + token.trim(), "content-type": "application/json" },
      });
      const result = await response.json() as RunResult & { error?: string };
      if (!response.ok) throw new Error(result.error || "Discovery request failed.");
      setRun(result);
      setToken("");
      setMessage("Discovery completed. The job feed has been refreshed from the configured sources.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Discovery could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-wrap discovery-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> LIVE SOURCE CONNECTORS</div>
          <h1>Job discovery <span>engine.</span></h1>
          <p className="welcome-copy">Fetch, normalise and store real vacancies from public job feeds and employer career systems.</p>
        </div>
        <button className="primary-button" onClick={runDiscovery} disabled={busy}><Play size={15} fill="currentColor" /> {busy ? "Working..." : "Run discovery"}</button>
      </div>

      <section className="discovery-connection panel">
        <div className="panel-heading"><div><h2>API connection</h2><p>Connect this interface to your deployed Cloudflare Worker.</p></div><span className={`connection-badge ${health === "connected" ? "is-connected" : ""}`}><i /> {health === "connected" ? "Connected to D1" : health === "checking" ? "Checking..." : "Not connected"}</span></div>
        <div className="discovery-config">
          <label><span>Worker API URL</span><input value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="https://hirepilot-api.your-subdomain.workers.dev" /></label>
          <button className="outline-button" onClick={saveEndpoint}><CheckCircle2 size={15} /> Save & test</button>
        </div>
        <div className="token-entry">
          <label><span><KeyRound size={13} /> Admin token <small>(not saved)</small></span><input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste your Cloudflare ADMIN_API_TOKEN to run discovery" autoComplete="off" /></label>
          <button className="primary-button" onClick={runDiscovery} disabled={busy}><Play size={14} fill="currentColor" /> Run now</button>
        </div>
        {message && <div className="notice"><CircleAlert size={16} /><span>{message}</span></div>}
      </section>

      <section className="stats-grid discovery-stats">
        <div className="stat-card"><div className="stat-icon teal"><Globe2 size={18} /></div><div className="stat-label">Stored vacancies</div><div className="stat-value">{total.toLocaleString()}</div><div className="stat-detail">From connected sources</div></div>
        <div className="stat-card"><div className="stat-icon mint"><Database size={18} /></div><div className="stat-label">Fetched last run</div><div className="stat-value">{run ? run.fetched : "—"}</div><div className="stat-detail">Returned by source APIs</div></div>
        <div className="stat-card"><div className="stat-icon blue"><CheckCircle2 size={18} /></div><div className="stat-label">New records</div><div className="stat-value">{run ? run.inserted : "—"}</div><div className="stat-detail">Inserted into D1</div></div>
        <div className="stat-card"><div className="stat-icon sand"><Activity size={18} /></div><div className="stat-label">Source errors</div><div className="stat-value">{run ? run.errors : "—"}</div><div className="stat-detail">Connector failures last run</div></div>
      </section>

      {run && <section className="panel run-summary"><div className="panel-heading"><div><h2>Latest discovery run</h2><p>Run ID: {run.runId}</p></div><span className="connection-badge is-connected"><i /> Completed</span></div><div className="run-metrics"><span><strong>{run.sourcesChecked}</strong> sources checked</span><span><strong>{run.updated}</strong> updated</span><span><strong>{run.duplicates}</strong> duplicates skipped</span><span><strong>{run.durationMs}ms</strong> duration</span></div><div className="source-results">{run.sources.map((source) => <div className="source-result" key={source.source}><span className={source.error ? "source-error" : "source-ok"}>{source.error ? <CircleAlert size={15} /> : <CheckCircle2 size={15} />}</span><strong>{source.source}</strong><span>{source.error || (source.fetched + " jobs fetched")}</span></div>)}</div></section>}

      <section className="panel discovered-jobs">
        <div className="panel-heading"><div><h2>Stored vacancies</h2><p>Source-attributed records returned by your D1 database.</p></div><button className="outline-button" onClick={() => void load()} disabled={busy}><RefreshCw size={14} /> Refresh</button></div>
        <div className="search-row"><div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} placeholder="Search title, company or description..." /></div><button className="filter-button" onClick={() => void load()}>Search</button></div>
        {jobs.length ? <div className="discovery-job-list">{jobs.map((job) => <article className="discovery-job" key={job.id}><div className="company-mark">{job.company.slice(0, 1).toUpperCase()}</div><div className="discovery-job-main"><strong>{job.title}</strong><span>{job.company} · {job.location}</span><div className="job-tags"><small>{job.source}</small><small>{job.workplace}</small>{job.employment_type && <small>{job.employment_type}</small>}{job.category && <small>{job.category}</small>}</div><p>{job.description.slice(0, 240)}{job.description.length > 240 ? "…" : ""}</p></div><a className="job-open-link" href={job.source_url} target="_blank" rel="noreferrer">View source <ArrowUpRight size={14} /></a></article>)}</div> : <div className="discovery-empty"><Globe2 size={25} /><strong>{health === "connected" ? "No vacancies stored yet" : "Connect your Worker to begin"}</strong><p>{health === "connected" ? "Run discovery after configuring at least one source connector." : "Deploy the Worker, configure D1 and add its URL above. This panel will then display real job records."}</p></div>}
      </section>
      <footer className="page-footer"><span>© 2026 HirePilot</span><span><i /> Public source listings · employer application links</span></footer>
    </div>
  );
}