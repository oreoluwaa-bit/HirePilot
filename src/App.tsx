import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness,
  Check, ChevronDown, CircleHelp, FileText, Filter, Globe2,
  LayoutDashboard, ListChecks, Menu, Play, Plus, Search, Settings2,
  ShieldCheck, Sparkles, Workflow, X
} from "lucide-react";

type Job = {
  id: string;
  role: string;
  company: string;
  location: string;
  type: string;
  category: string;
  match: number | null;
  status: string;
  source?: string;
  age: string;
};

const sampleJobs: Job[] = [
  { id: "HP-001", role: "Customer Support Specialist", company: "Northstar Cloud", location: "Remote · Worldwide", type: "Full-time", category: "Customer Service", match: 94, status: "Ready to review", age: "2h ago" },
  { id: "HP-002", role: "Operations Coordinator", company: "Flowdesk", location: "Remote · EMEA", type: "Contract", category: "Operations", match: 88, status: "Eligibility check", age: "5h ago" },
  { id: "HP-003", role: "IT Support Analyst", company: "Vertex Systems", location: "Lagos, Nigeria", type: "Full-time", category: "Technology", match: 82, status: "New", age: "Yesterday" },
];

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Job discovery", icon: Search },
  { label: "My matches", icon: Sparkles },
  { label: "CV & documents", icon: FileText },
  { label: "Applications", icon: ListChecks },
  { label: "Automation centre", icon: Workflow },
];

function App() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>(sampleJobs);
  const [feedMode, setFeedMode] = useState<"preview" | "live" | "unavailable">("preview");
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const loadJobs = async () => {
    setLoadingFeed(true);
    try {
      const response = await fetch("/api/jobs?limit=50");
      if (!response.ok) throw new Error("Job API returned " + response.status);
      const data = await response.json();
      const liveJobs: Job[] = (data.jobs ?? []).map((item: any) => ({
        id: item.id,
        role: item.title,
        company: item.company,
        location: item.location || "Location not specified",
        type: item.employment_type || "Not specified",
        category: item.department || item.team || "Job listing",
        match: null,
        status: "New",
        source: item.source_name || item.source_provider || "Job source",
        age: item.published_at ? new Date(item.published_at).toLocaleDateString() : "Date not supplied",
      }));
      if (liveJobs.length) {
        setJobs(liveJobs);
        setFeedMode("live");
        setNotice("");
      } else {
        setJobs(sampleJobs);
        setFeedMode("preview");
        setNotice("No live vacancies are stored yet. Configure job sources and run the protected discovery endpoint.");
      }
    } catch {
      setJobs(sampleJobs);
      setFeedMode("unavailable");
      setNotice("The live job API is not available yet. Showing clearly labelled preview records.");
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => { void loadJobs(); }, []);

  const filteredJobs = useMemo(
    () => jobs.filter((job) => (job.role + " " + job.company + " " + job.category).toLowerCase().includes(query.toLowerCase())),
    [jobs, query],
  );

  const startDemo = () => { void loadJobs(); };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><BriefcaseBusiness size={21} strokeWidth={2.4} /></div>
          <div><strong>hirepilot</strong><span>YOUR CAREER, IN MOTION</span></div>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setMenuOpen(false); }}>
              <Icon size={18} /><span>{label}</span>{label === "Automation centre" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="agent-card">
            <div className="agent-icon"><Sparkles size={17} /></div>
            <div><strong>Your job agent</strong><p>Set up your personal search agent to get started.</p></div>
            <button aria-label="Configure job agent" onClick={() => setNotice("Personal Job Agent setup will be added in the next build.")}><ChevronDown size={15} /></button>
          </div>
          <button className="nav-item" onClick={() => setNotice("Settings are coming in a later build.")}><Settings2 size={18} /><span>Settings</span></button>
          <div className="profile-row">
            <div className="avatar">DV</div>
            <div><strong>Demo workspace</strong><span>Candidate account</span></div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <span className="system-status"><i /> System ready</span>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You're all caught up.")}><Bell size={18} /><i /></button>
            <div className="avatar top-avatar">DV</div>
          </div>
        </header>

        <div className="page-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR CAREER COMMAND CENTRE</div>
              <h1>Good morning. <span>Let's get you hired.</span></h1>
              <p className="welcome-copy">Discover opportunities, find your fit, and let automation handle the busywork.</p>
            </div>
            <button className="primary-button" onClick={startDemo} disabled={loadingFeed}><Play size={16} fill="currentColor" /> {loadingFeed ? "Refreshing..." : "Refresh job feed"}</button>
          </section>

          {notice && <div className="notice"><CircleHelp size={17} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div>}

          <section className="agent-banner">
            <div className="banner-symbol"><Sparkles size={23} /></div>
            <div className="banner-copy"><div className="banner-title">Your next opportunity shouldn't depend on endless scrolling.</div><p>HirePilot's personal job agent will search, evaluate, and prepare applications around your goals.</p></div>
            <button className="banner-button" onClick={() => setNotice("Agent configuration is not connected yet. We'll build the profile and scheduling flow next.")}>Set up my agent <ArrowUpRight size={16} /></button>
            <div className="banner-decoration" />
          </section>

          <section className="section-heading">
            <div><h2>Activity overview</h2><p>A snapshot of your job search activity</p></div>
            <button className="date-filter" onClick={() => setNotice("Date filtering will be connected to live activity data.")}>Last 30 days <ChevronDown size={15} /></button>
          </section>

          <section className="stats-grid">
            <StatCard label="Jobs discovered" value="—" detail="Waiting for source connection" icon={<Globe2 size={18} />} tone="teal" />
            <StatCard label="Strong matches" value="—" detail="Based on your profile" icon={<Sparkles size={18} />} tone="mint" />
            <StatCard label="Applications prepared" value="—" detail="Human approval enabled" icon={<FileText size={18} />} tone="blue" />
            <StatCard label="Applications submitted" value="—" detail="Only confirmed submissions" icon={<Check size={18} />} tone="sand" />
          </section>

          <div className="content-grid">
            <section className="panel jobs-panel">
              <div className="panel-heading"><div><h2>Opportunity feed</h2><p>{feedMode === "live" ? "Live vacancies from connected job sources" : feedMode === "unavailable" ? "API unavailable · showing preview records" : "Preview records · live job sources not connected yet"}</p></div><button className="text-button" onClick={() => setActiveNav("Job discovery")}>Open discovery <ArrowUpRight size={15} /></button></div>
              <div className="search-row"><div className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles, companies or skills..." /></div><button className="filter-button" onClick={() => setNotice("Job filters will be available when live job discovery is connected.")}><Filter size={17} /><span>Filters</span></button></div>
              <div className="job-list">
                {filteredJobs.map((job) => <JobRow key={job.id} job={job} onSelect={() => setNotice(job.source ? `${job.role} · Source: ${job.source}. Open the employer listing to review full requirements and location eligibility.` : `${job.role} is illustrative sample data. Live job details and eligibility checks are not connected yet.`)} />)}
                {filteredJobs.length === 0 && <div className="empty-state">No sample roles match that search.</div>}
              </div>
              <div className="panel-footer"><span>{feedMode === "live" ? "Live feed · source attribution retained" : "Sample interface data only"}</span><button onClick={() => setActiveNav("Job discovery")}>Explore job discovery <ArrowUpRight size={14} /></button></div>
            </section>

            <section className="right-column">
              <div className="panel automation-panel">
                <div className="panel-heading"><div><h2>Automation centre</h2><p>Workflow engine connection</p></div><span className="connection-badge"><i /> Not connected</span></div>
                <div className="automation-empty"><div className="automation-art"><Workflow size={25} /><span className="orbit orbit-one" /><span className="orbit orbit-two" /></div><strong>Make work flow.</strong><p>Connect Activepieces to run real job discovery, matching, and application workflows.</p><button className="outline-button" onClick={() => setActiveNav("Automation centre")}>Explore automations <ArrowUpRight size={15} /></button></div>
                <div className="automation-foot"><span><Activity size={15} /> No workflow runs yet</span><span><ShieldCheck size={15} /> Approval-first</span></div>
              </div>
              <div className="panel checklist-panel">
                <div className="panel-heading"><div><h2>Getting started</h2><p>Your setup checklist</p></div><span className="progress-label">0 of 4</span></div>
                <div className="progress-track"><span /></div>
                <ChecklistItem title="Create your candidate profile" description="Add your experience and preferences" />
                <ChecklistItem title="Upload your latest CV" description="Give your job agent the right context" />
                <ChecklistItem title="Connect job sources" description="Choose where to discover vacancies" />
                <ChecklistItem title="Configure your job agent" description="Set your search and approval rules" />
              </div>
            </section>
          </div>

          <footer className="page-footer"><span>© 2026 HirePilot</span><span><i /> Built for transparent, responsible automation</span><button onClick={() => setNotice("Help centre documentation will be added as the product develops.")}><CircleHelp size={14} /> Help & feedback</button></footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>;
}

function JobRow({ job, onSelect }: { job: Job; onSelect: () => void }) {
  return <button className="job-row" onClick={onSelect}><div className="company-mark">{job.company.slice(0, 1)}</div><div className="job-main"><strong>{job.role}</strong><span>{job.company} <b>·</b> {job.location}</span><div className="job-tags"><small>{job.category}</small><small>{job.type}</small>{job.source && <small>{job.source}</small>}</div></div><div className="job-meta">{job.match !== null ? <span className="match-score">{job.match}% match</span> : <span className="job-status">Not matched</span>}<span className={`job-status ${job.status === "Ready to review" ? "ready" : ""}`}>{job.status}</span><small>{job.age}</small></div><ArrowDownRight className="job-arrow" size={17} /></button>;
}

function ChecklistItem({ title, description }: { title: string; description: string }) {
  return <div className="checklist-item"><span className="check-circle"><Plus size={14} /></span><div><strong>{title}</strong><p>{description}</p></div><ChevronDown size={15} /></div>;
}

export default App;
