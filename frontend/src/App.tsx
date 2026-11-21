import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Aperture,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Download,
  ExternalLink,
  FileSearch,
  Globe2,
  History,
  Link2,
  LoaderCircle,
  Menu,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import sample from "../../examples/sample-response.json";
import { analyzeWebsite, exportReport, getHealth } from "./api";
import {
  Audience,
  Competitors,
  Overview,
  Pill,
  SearchQueries,
  SEO,
  Services,
  Sources,
} from "./components/ReportPanels";
import type { Health, Report, Tab } from "./types";

const tabs: Tab[] = [
  "Overview",
  "Competitors",
  "Search queries",
  "SEO opportunities",
  "Services",
  "Audience",
  "Sources",
];
const sampleReport: Report = sample;
type View = "workspace" | "history" | "methodology";

function loadHistory(): Report[] {
  try {
    const data = JSON.parse(sessionStorage.getItem("aperture-history") || "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (item) =>
              item?.success &&
              item?.brand?.name &&
              item?.analysis?.top_services &&
              item?.metadata?.request_id,
          )
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function LensArtwork() {
  return (
    <div className="lens-art" aria-hidden="true">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="orbit orbit-three" />
      <div className="lens-center">
        <Aperture strokeWidth={0.7} />
      </div>
      <span className="art-cross cross-one">+</span>
      <span className="art-cross cross-two">+</span>
      <div className="art-tag">
        <Sparkles size={12} /> A NEW PERSPECTIVE
      </div>
    </div>
  );
}

function LoadingReport({
  elapsed,
  onCancel,
}: {
  elapsed: number;
  onCancel: () => void;
}) {
  return (
    <section className="loading-state" aria-live="polite" aria-busy="true">
      <div className="loading-orbit">
        <Aperture size={46} strokeWidth={1} />
      </div>
      <span className="eyebrow">CONNECTING THE DOTS</span>
      <h2>
        A little research.
        <br />A clearer perspective.
      </h2>
      <p>
        Reading the website, analyzing its offering, and building your report
        with Gemini.
      </p>
      <div className="loading-time">
        <LoaderCircle size={16} className="spin" /> {elapsed}s elapsed · this
        can take a minute or two
      </div>
      <button className="text-button" onClick={onCancel}>
        Cancel analysis
      </button>
    </section>
  );
}

export default function App() {
  const [view, setView] = useState<View>("workspace");
  const [tab, setTab] = useState<Tab>("Overview");
  const [report, setReport] = useState<Report | null>(sampleReport);
  const [url, setUrl] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [healthFailed, setHealthFailed] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [history, setHistory] = useState<Report[]>(loadHistory);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const controller = useRef<AbortController | null>(null);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const reportRegion = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController();
    getHealth(abort.signal)
      .then(setHealth)
      .catch((error) => {
        if (error.name !== "AbortError") setHealthFailed(true);
      });
    return () => {
      mounted.current = false;
      abort.abort();
      controller.current?.abort();
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("aperture-history", JSON.stringify(history));
    } catch {
      /* Memory-only history remains usable when storage is full. */
    }
  }, [history]);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function navigate(next: View) {
    setView(next);
    setMobileOpen(false);
  }
  function newAnalysis() {
    navigate("workspace");
    setError("");
    setUrl("");
    requestAnimationFrame(() => {
      urlInput.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  function showSample() {
    controller.current?.abort();
    setBusy(false);
    setReport(sampleReport);
    setTab("Overview");
    setError("");
    navigate("workspace");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    let normalized = url.trim();
    if (!/^[a-z][a-z\d+.-]*:/i.test(normalized))
      normalized = `https://${normalized}`;
    try {
      const parsed = new URL(normalized);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password
      )
        throw new Error();
    } catch {
      setError("Enter a valid public website, such as https://example.com.");
      return;
    }
    setUrl(normalized);
    setElapsed(0);
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      abort.abort();
    }, 160000);
    try {
      const result = await analyzeWebsite(normalized, apiKey, abort.signal);
      if (!mounted.current || controller.current !== abort) return;
      setReport(result);
      setTab("Overview");
      setHistory((previous) =>
        [
          result,
          ...previous.filter((item) => item.website !== result.website),
        ].slice(0, 8),
      );
      setToast("Your report is ready.");
      requestAnimationFrame(() => reportRegion.current?.focus());
    } catch (cause) {
      if (!mounted.current || controller.current !== abort) return;
      if (cause instanceof Error && cause.name === "AbortError") {
        if (timedOut)
          setError(
            "The analysis timed out. Try a smaller public page or retry shortly.",
          );
      } else
        setError(
          cause instanceof TypeError
            ? "Unable to reach the API. Start the Python server on port 4000 and try again."
            : cause instanceof Error
              ? cause.message
              : "Something went wrong. Please try again.",
        );
    } finally {
      clearTimeout(timeout);
      if (mounted.current && controller.current === abort) {
        setBusy(false);
        controller.current = null;
      }
    }
  }

  const connectionLabel = health?.configured
    ? "Gemini connected"
    : healthFailed
      ? "API offline"
      : health
        ? "Gemini setup needed"
        : "Checking connection";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <button
          className="brand-logo"
          onClick={() => navigate("workspace")}
          aria-label="Aperture home"
        >
          <Aperture size={31} strokeWidth={1.5} />
          <span>
            aperture<span className="brand-period">.</span>
          </span>
        </button>
        <div className="workspace-switch">
          <span className="workspace-avatar">W</span>
          <div>
            <strong>Your workspace</strong>
            <span>Website intelligence</span>
          </div>
          <Settings2 size={16} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          <button
            className={view === "workspace" ? "active" : ""}
            onClick={() => navigate("workspace")}
          >
            <FileSearch size={19} /> Website analysis{" "}
            <span className="nav-active-dot" />
          </button>
          <button
            className={view === "history" ? "active" : ""}
            onClick={() => navigate("history")}
          >
            <History size={19} /> Recent reports{" "}
            <span className="nav-count">{history.length}</span>
          </button>
          <button
            className={view === "methodology" ? "active" : ""}
            onClick={() => navigate("methodology")}
          >
            <BookOpen size={19} /> How it works
          </button>
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <Sparkles size={20} />
          </div>
          <h3>
            Small details.
            <br />
            Bigger possibilities.
          </h3>
          <p>See your website from a fresh perspective.</p>
          <button onClick={showSample}>
            Explore a sample report <FileSearch size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <a href="/docs" target="_blank" rel="noreferrer">
            <Code2 size={18} /> API documentation <ExternalLink size={14} />
          </a>
          <button onClick={() => settingsDialog.current?.showModal()}>
            <Settings2 size={18} /> Connection settings
          </button>
          <div className="sidebar-footer">
            <span className="mini-mark">
              <Aperture size={19} />
            </span>
            <div>
              <strong>Made for a clearer view</strong>
              <span>Powered by Google Gemini</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {view === "workspace"
                ? "Website analysis"
                : view === "history"
                  ? "Recent reports"
                  : "How it works"}
            </strong>
          </div>
          <div className="topbar-actions">
            <button
              className={`connection ${health?.configured ? "connected" : ""}`}
              onClick={() => settingsDialog.current?.showModal()}
            >
              <span />
              {connectionLabel}
            </button>
            <button
              className="help-button icon-button"
              aria-label="How Aperture works"
              onClick={() => navigate("methodology")}
            >
              <CircleHelp size={20} />
            </button>
            <span className="user-avatar" aria-label="Your workspace">
              W
            </span>
          </div>
        </header>
        <main id="main-content">
          {view === "workspace" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow">
                    <span className="eyebrow-line" /> WEBSITE INTELLIGENCE, IN
                    FOCUS
                  </span>
                  <h1>
                    A clearer view.
                    <br />
                    <span>A smarter next move.</span>
                  </h1>
                  <p>
                    Turn any public website into a practical growth playbook.
                    <br className="desktop-break" /> Understand the brand. Find
                    the gaps. Discover what’s next.
                  </p>
                </div>
                <LensArtwork />
              </section>
              <section
                className="analysis-input"
                aria-label="Analyze a website"
              >
                <form onSubmit={submit}>
                  <label htmlFor="website-url" className="sr-only">
                    Website URL
                  </label>
                  <div className="url-field">
                    <Link2 size={21} />
                    <input
                      ref={urlInput}
                      id="website-url"
                      name="url"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="Enter a website URL, e.g. https://yourbrand.com"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      maxLength={2048}
                      required
                      disabled={busy}
                      aria-describedby={error ? "analysis-error" : "url-help"}
                    />
                  </div>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={busy}
                  >
                    {busy ? (
                      <LoaderCircle size={17} className="spin" />
                    ) : (
                      <Sparkles size={17} />
                    )}
                    {busy ? "Analyzing…" : "Analyze website"}
                  </button>
                </form>
                <div className="input-footer">
                  <span id="url-help">
                    <ShieldCheck size={14} /> Public websites only.
                    Evidence-aware insights.
                  </span>
                  <button
                    className="text-button"
                    onClick={showSample}
                    disabled={busy}
                  >
                    Try a sample report
                  </button>
                </div>
              </section>
              {error && (
                <div className="error-banner" role="alert" id="analysis-error">
                  <div>
                    <strong>We couldn’t complete that analysis.</strong>
                    <p>{error}</p>
                    {report && (
                      <small>The previous report remains below.</small>
                    )}
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Dismiss error"
                    onClick={() => setError("")}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              {busy ? (
                <LoadingReport
                  elapsed={elapsed}
                  onCancel={() => {
                    controller.current?.abort();
                    setToast("Analysis canceled.");
                    setBusy(false);
                  }}
                />
              ) : (
                report && (
                  <div
                    className="report-region"
                    ref={reportRegion}
                    tabIndex={-1}
                  >
                    <div className="report-toolbar">
                      <div className="report-title">
                        <span className="report-brand-icon">
                          {report.brand.name.slice(0, 1)}
                        </span>
                        <div>
                          <div className="report-name">
                            <h2>{report.brand.name}</h2>
                            <Pill
                              tone={
                                report.metadata.is_demo ? "orange" : "green"
                              }
                            >
                              {report.metadata.is_demo
                                ? "Sample report"
                                : report.metadata.cached
                                  ? "Cached report"
                                  : "Analysis complete"}
                            </Pill>
                          </div>
                          <span className="report-domain">
                            <Globe2 size={13} />
                            {report.website
                              .replace(/^https?:\/\//, "")
                              .replace(/\/$/, "")}
                            <span>·</span>
                            {report.metadata.source_count}{" "}
                            {report.metadata.source_count === 1
                              ? "page"
                              : "pages"}{" "}
                            analyzed
                            {!report.metadata.is_demo && (
                              <>
                                <span>·</span>
                                {(report.metadata.duration_ms / 1000).toFixed(
                                  1,
                                )}
                                s
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      <button
                        className="secondary-button export-button"
                        onClick={() => {
                          exportReport(report);
                          setToast("JSON report exported.");
                        }}
                      >
                        <Download size={16} /> Export report
                      </button>
                    </div>
                    {report.metadata.is_demo && (
                      <div className="sample-caption">
                        <span>EXAMPLE</span> Meet Forma, a fictional design
                        studio. This report illustrates the experience; it isn’t
                        a live analysis.
                      </div>
                    )}
                    <div
                      className="report-tabs"
                      role="tablist"
                      aria-label="Report sections"
                    >
                      {tabs.map((item) => (
                        <button
                          key={item}
                          id={`tab-${item.replaceAll(" ", "-")}`}
                          role="tab"
                          aria-selected={tab === item}
                          aria-controls="report-panel"
                          tabIndex={tab === item ? 0 : -1}
                          className={tab === item ? "active" : ""}
                          onClick={() => setTab(item)}
                          onKeyDown={(event) => {
                            if (
                              [
                                "ArrowRight",
                                "ArrowLeft",
                                "Home",
                                "End",
                              ].includes(event.key)
                            ) {
                              event.preventDefault();
                              const index =
                                event.key === "Home"
                                  ? 0
                                  : event.key === "End"
                                    ? tabs.length - 1
                                    : (tabs.indexOf(item) +
                                        (event.key === "ArrowRight" ? 1 : -1) +
                                        tabs.length) %
                                      tabs.length;
                              setTab(tabs[index]);
                              document
                                .getElementById(
                                  `tab-${tabs[index].replaceAll(" ", "-")}`,
                                )
                                ?.focus();
                            }
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <div
                      id="report-panel"
                      role="tabpanel"
                      aria-labelledby={`tab-${tab.replaceAll(" ", "-")}`}
                      tabIndex={0}
                      className="report-content"
                    >
                      {tab === "Overview" && (
                        <Overview report={report} onNavigate={setTab} />
                      )}
                      {tab === "Competitors" && <Competitors report={report} />}
                      {tab === "Search queries" && (
                        <SearchQueries report={report} />
                      )}
                      {tab === "SEO opportunities" && <SEO report={report} />}
                      {tab === "Services" && <Services report={report} />}
                      {tab === "Audience" && <Audience report={report} />}
                      {tab === "Sources" && <Sources report={report} />}
                    </div>
                  </div>
                )
              )}
            </>
          )}

          {view === "history" && (
            <section className="utility-page animate-in">
              <span className="eyebrow">YOUR RESEARCH, TOGETHER</span>
              <div className="page-title-row">
                <div>
                  <h1>
                    Recent reports<span>.</span>
                  </h1>
                  <p>
                    Up to eight live reports, kept in this browser tab’s
                    session.
                  </p>
                </div>
                <button className="primary-button" onClick={newAnalysis}>
                  <Plus size={17} /> New analysis
                </button>
              </div>
              {history.length ? (
                <>
                  <div className="history-grid">
                    {history.map((item) => (
                      <button
                        className="card history-card"
                        key={item.metadata.request_id}
                        onClick={() => {
                          setReport(item);
                          setTab("Overview");
                          navigate("workspace");
                        }}
                      >
                        <div className="card-top">
                          <span className="report-brand-icon">
                            {item.brand.name.slice(0, 1)}
                          </span>
                          <Clock3 size={18} />
                        </div>
                        <h2>{item.brand.name}</h2>
                        <p>{item.website}</p>
                        <div className="history-meta">
                          <span>{item.metadata.source_count} pages</span>
                          <span>
                            {new Date(
                              item.metadata.generated_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    className="text-button clear-history"
                    onClick={() => {
                      setHistory([]);
                      setToast("Session history cleared.");
                    }}
                  >
                    Clear session history
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <History size={38} strokeWidth={1.2} />
                  <h2>Your next discovery starts here.</h2>
                  <p>
                    Run a live website analysis and your report will appear
                    here.
                    <br />
                    Sample reports aren’t saved to your history.
                  </p>
                  <button className="secondary-button" onClick={newAnalysis}>
                    <Plus size={16} /> Analyze your first website
                  </button>
                </div>
              )}
            </section>
          )}

          {view === "methodology" && (
            <section className="utility-page methodology animate-in">
              <span className="eyebrow">CLARITY, WITH CONTEXT</span>
              <h1>
                Good insights show
                <br />
                their working<span>.</span>
              </h1>
              <p className="intro">
                Aperture turns publicly readable website content into a
                structured starting point for business research.
              </p>
              <div className="method-grid">
                {[
                  {
                    icon: Globe2,
                    title: "Read the website",
                    text: "We safely fetch the submitted page and up to two relevant About, Services, or Product pages. Scripts, navigation, and duplicate text are removed.",
                  },
                  {
                    icon: Sparkles,
                    title: "Connect the evidence",
                    text: "Gemini analyzes the extracted content across competitors, search, SEO, services, and audiences. Every report must pass a structured response contract.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Keep the limits visible",
                    text: "Service excerpts are matched to the source text. Competitors stay labeled as suggestions, and audience profiles as interpretations. No search volumes or ranking scores are invented.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <article className="card" key={title}>
                    <span className="method-icon">
                      <Icon size={24} />
                    </span>
                    <h2>{title}</h2>
                    <p>{text}</p>
                  </article>
                ))}
              </div>
              <div className="two-col">
                <article className="card">
                  <h3>What works best</h3>
                  <p>
                    Public business homepages and service pages with useful text
                    in their HTML. A specific page often gives a clearer report
                    than a broad portal.
                  </p>
                  <p>
                    JavaScript-only pages, sign-in pages, blocked crawlers, and
                    oversized pages may not be accessible. Aperture does not
                    bypass these restrictions.
                  </p>
                </article>
                <article className="card">
                  <h3>You’re in control</h3>
                  <p>
                    The Gemini key stays on the Python server. Live reports are
                    cached in server memory for 15 minutes by default, and
                    recent reports stay in your browser session.
                  </p>
                  <p>
                    Extracted public content is sent to Google for analysis.
                    Review recommendations before using them to make decisions.
                  </p>
                </article>
              </div>
              <a
                className="secondary-button inline-button"
                href="/docs"
                target="_blank"
                rel="noreferrer"
              >
                <Code2 size={17} /> Explore the API documentation{" "}
                <ExternalLink size={14} />
              </a>
            </section>
          )}
          <footer className="page-footer">
            <span>
              <Aperture size={16} /> A little perspective goes a long way.
            </span>
            <span>Built with FastAPI, React & Gemini</span>
          </footer>
        </main>
      </div>

      <dialog
        ref={settingsDialog}
        className="settings-dialog"
        aria-labelledby="connection-title"
        onClick={(event) => {
          if (event.target === event.currentTarget)
            settingsDialog.current?.close();
        }}
      >
        <div className="dialog-heading">
          <span className="method-icon">
            <Settings2 size={23} />
          </span>
          <button
            className="icon-button"
            aria-label="Close settings"
            onClick={() => settingsDialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="connection-title">Your connection</h2>
        <p>
          Live analysis uses the Gemini key configured on the Python server.
        </p>
        <div className="connection-detail">
          <Activity size={18} />
          <span>{connectionLabel}</span>
        </div>
        {!health?.configured && (
          <div className="setup-steps">
            <p>
              Copy <code>.env.example</code> to <code>.env</code> in the project
              root, add <code>GEMINI_API_KEY</code>, then restart the API.
            </p>
            <code>uvicorn app.main:app --port 4000</code>
          </div>
        )}
        {health?.configured && <p className="muted">Model: {health.model}</p>}
        <label htmlFor="api-access-key">
          Analysis access key{" "}
          <span>
            {health?.authentication_required ? "(required)" : "(optional)"}
          </span>
        </label>
        <input
          id="api-access-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Only if ANALYSIS_API_KEY is enabled"
        />
        <p className="footnote">
          This is the app’s access key, not your Gemini key. It is held in
          memory and cleared when you reload.
        </p>
        <button
          className="primary-button full-width"
          onClick={() => {
            settingsDialog.current?.close();
            const abort = new AbortController();
            getHealth(abort.signal)
              .then((value) => {
                setHealth(value);
                setHealthFailed(false);
              })
              .catch(() => setHealthFailed(true));
          }}
        >
          <Check size={17} /> Done
        </button>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} /> {toast}
        </div>
      )}
    </div>
  );
}
