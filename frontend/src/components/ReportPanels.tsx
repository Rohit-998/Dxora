import { useState } from "react";
import {
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Globe2,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  WandSparkles,
} from "lucide-react";
import type { Report, Tab } from "../types";

type Props = { report: Report };

export function Pill({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Tags({ values }: { values: string[] }) {
  return (
    <div className="tags">
      {values.map((value, index) => (
        <span key={`${value}-${index}`}>{value}</span>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="insight-list">
      {items.map((item, index) => (
        <li key={index}>
          <span className="bullet" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PanelHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="panel-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export function Overview({
  report,
  onNavigate,
}: Props & { onNavigate: (tab: Tab) => void }) {
  const { analysis, brand } = report;
  const stats = [
    {
      value: analysis.competitor_analysis.competitors.length,
      label: "Competitor suggestions",
      icon: Flag,
      tab: "Competitors" as Tab,
    },
    {
      value: analysis.target_search_queries.length,
      label: "Target search queries",
      icon: Search,
      tab: "Search queries" as Tab,
    },
    {
      value: analysis.top_services.length,
      label: "Core services identified",
      icon: Layers3,
      tab: "Services" as Tab,
    },
    {
      value: analysis.target_audience.segments.length,
      label: "Audience segments",
      icon: Users,
      tab: "Audience" as Tab,
    },
  ];
  return (
    <div className="overview animate-in">
      <div className="stats-grid">
        {stats.map(({ value, label, icon: Icon, tab }) => (
          <button className="stat" key={label} onClick={() => onNavigate(tab)}>
            <span className="stat-icon">
              <Icon size={18} />
            </span>
            <span className="stat-value">{String(value).padStart(2, "0")}</span>
            <span className="stat-label">{label}</span>
          </button>
        ))}
      </div>
      <div className="overview-grid">
        <article className="card brand-card">
          <div className="card-top">
            <span className="eyebrow">THE BIG PICTURE</span>
            <Globe2 size={19} />
          </div>
          <h2>
            A brand with
            <br />
            <span>room to grow.</span>
          </h2>
          <p>{brand.summary}</p>
          <Tags
            values={[
              brand.category,
              ...analysis.target_audience.primary_audience.slice(0, 2),
            ]}
          />
          <div className="brand-position">
            <span className="small-label">POSITIONING SNAPSHOT</span>
            <p>{analysis.competitor_analysis.brand_overview}</p>
          </div>
        </article>
        <article className="card opportunity-card">
          <div className="card-top">
            <span className="eyebrow">
              <Sparkles size={15} /> WHERE TO FOCUS
            </span>
            <Pill tone="orange">Recommendations</Pill>
          </div>
          <h2>Your next moves</h2>
          <p className="muted">
            A starting point for a stronger digital presence.
          </p>
          <div className="next-moves">
            {analysis.competitor_analysis.opportunities
              .slice(0, 3)
              .map((item, index) => (
                <div key={item}>
                  <span className="move-icon">
                    {index === 0 ? (
                      <FileText size={18} />
                    ) : index === 1 ? (
                      <BookOpen size={18} />
                    ) : (
                      <Target size={18} />
                    )}
                  </span>
                  <p>{item}</p>
                </div>
              ))}
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate("SEO opportunities")}
          >
            Explore SEO opportunities <ChevronDown size={15} />
          </button>
        </article>
      </div>
      <div className="overview-bottom">
        <article className="card">
          <div className="card-top">
            <h3>Your competitive edge</h3>
            <ShieldCheck size={19} />
          </div>
          <BulletList items={analysis.competitor_analysis.strengths} />
        </article>
        <article className="card">
          <div className="card-top">
            <h3>Meet your audience</h3>
            <Users size={19} />
          </div>
          <p className="muted">Inferred from the business and its offering.</p>
          <div className="audience-mini">
            {analysis.target_audience.primary_audience.map(
              (audience, index) => (
                <div key={audience}>
                  <span className={`avatar avatar-${index % 3}`}>
                    <Users size={17} />
                  </span>
                  <span>{audience}</span>
                </div>
              ),
            )}
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate("Audience")}
          >
            Explore audience profiles <ChevronDown size={15} />
          </button>
        </article>
      </div>
    </div>
  );
}

export function Competitors({ report }: Props) {
  const analysis = report.analysis.competitor_analysis;
  return (
    <div className="animate-in">
      <PanelHeading
        eyebrow="THE COMPETITIVE LANDSCAPE"
        title="Find your place in the market."
        description="Potential alternatives customers might consider, with hypotheses to investigate."
      />
      <div className="notice">
        <ShieldCheck size={19} />
        <p>
          These are <strong>unverified AI suggestions</strong>. Strengths and
          gaps need independent research before informing business decisions.
        </p>
      </div>
      <div className="competitor-grid">
        {analysis.competitors.map((competitor, index) => (
          <article className="card competitor-card" key={competitor.name}>
            <div className="card-top">
              <div className={`brand-monogram color-${index % 3}`}>
                {competitor.name.slice(0, 1)}
              </div>
              <Pill>AI suggestion</Pill>
            </div>
            <h2>{competitor.name}</h2>
            <p>{competitor.comparison}</p>
            <span className="small-label">POTENTIAL STRENGTHS</span>
            <BulletList items={competitor.strengths} />
            <span className="small-label">GAPS TO INVESTIGATE</span>
            <BulletList items={competitor.gaps} />
          </article>
        ))}
      </div>
      {!analysis.competitors.length && (
        <div className="empty-inline">
          There wasn’t enough reliable context to suggest named competitors.
        </div>
      )}
      <div className="two-col">
        <article className="card">
          <h3>Your brand’s advantages</h3>
          <BulletList items={analysis.strengths} />
        </article>
        <article className="card soft-orange">
          <h3>Positioning opportunities</h3>
          <BulletList items={analysis.opportunities} />
        </article>
      </div>
    </div>
  );
}

export function SearchQueries({ report }: Props) {
  const [platform, setPlatform] = useState("All platforms");
  const queries = report.analysis.target_search_queries.filter(
    (query) =>
      platform === "All platforms" || query.platforms.includes(platform),
  );
  return (
    <div className="animate-in">
      <PanelHeading
        eyebrow="SEARCH INTELLIGENCE"
        title="Be there when they’re looking."
        description="Five intent-led queries, adapted to how your audience searches and discovers businesses."
      />
      <div className="filter-row" aria-label="Filter queries by platform">
        {[
          "All platforms",
          "Google",
          "Facebook",
          "Instagram",
          "LinkedIn",
          "X",
        ].map((item) => (
          <button
            key={item}
            aria-pressed={platform === item}
            className={`filter-chip ${platform === item ? "selected" : ""}`}
            onClick={() => setPlatform(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="query-list">
        {queries.map((query) => (
          <article className="card query-card" key={query.query}>
            <div className="query-mark">
              <Search size={21} />
            </div>
            <div className="query-main">
              <div className="card-top">
                <h3>{query.query}</h3>
                <Pill tone="green">{query.intent}</Pill>
              </div>
              <p>{query.business_relevance}</p>
              <div className="query-details">
                <Tags values={query.platforms} />
                <span>
                  <Users size={14} /> {query.target_audience}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="footnote">
        Suggested queries, not measured rankings. Search volumes and platform
        performance data are not available.
      </p>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied");
    } catch {
      setStatus("Copy unavailable");
    }
    setTimeout(() => setStatus(""), 2000);
  }
  return (
    <button
      className="icon-button"
      onClick={copy}
      aria-label={status || "Copy text"}
      title={status || "Copy text"}
    >
      {status === "Copied" ? <Check size={16} /> : <Copy size={16} />}
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </button>
  );
}

export function SEO({ report }: Props) {
  const seo = report.analysis.seo_improvements;
  return (
    <div className="animate-in">
      <PanelHeading
        eyebrow="SEARCH ENGINE OPPORTUNITIES"
        title="Make your expertise easier to find."
        description="Practical content recommendations, grounded in what the website offers."
      />
      <div className="two-col seo-top">
        <article className="card">
          <div className="card-top">
            <h3>Your keyword direction</h3>
            <Target size={19} />
          </div>
          <span className="small-label">PRIMARY KEYWORD</span>
          <div className="primary-keyword">{seo.primary_keyword}</div>
          <span className="small-label">SECONDARY KEYWORDS</span>
          <Tags values={seo.secondary_keywords} />
          <span className="small-label spaced">LONG-TAIL OPPORTUNITIES</span>
          <Tags values={seo.long_tail_keywords} />
          <span className="small-label spaced">BUSINESS KEYWORDS</span>
          <Tags values={seo.business_keywords} />
        </article>
        <article className="card snippet-card">
          <div className="card-top">
            <h3>A better first impression</h3>
            <WandSparkles size={19} />
          </div>
          <p className="muted">
            Suggested search appearance · not a live result
          </p>
          <div className="search-snippet">
            <span className="snippet-site">
              <Globe2 size={22} />
              <span>
                {report.brand.name}
                <small>{report.website}</small>
              </span>
            </span>
            <h3>{seo.recommended_title}</h3>
            <p>{seo.meta_description}</p>
          </div>
          <div className="copy-row">
            <span>
              SEO title <small>{seo.recommended_title.length} characters</small>
            </span>
            <CopyButton value={seo.recommended_title} />
          </div>
          <div className="copy-row">
            <span>
              Meta description{" "}
              <small>{seo.meta_description.length} characters</small>
            </span>
            <CopyButton value={seo.meta_description} />
          </div>
          <p className="footnote">{seo.title_rationale}</p>
        </article>
      </div>
      <h3 className="section-title">What the HTML tells us</h3>
      <div className="checks-grid">
        {report.seo_checks.map((check) => (
          <article className="check-card" key={check.name}>
            {check.status === "pass" ? (
              <CheckCheck size={19} className="green-icon" />
            ) : (
              <Flag size={19} className="orange-icon" />
            )}
            <div>
              <strong>{check.name}</strong>
              <p>{check.detail}</p>
            </div>
            <Pill tone={check.status === "pass" ? "green" : "orange"}>
              {check.status === "pass" ? "Present / in range" : "Review"}
            </Pill>
          </article>
        ))}
      </div>
      <p className="footnote">
        Basic HTML checks, not a full SEO audit. Character ranges are guidelines
        and do not predict rankings.
      </p>
      <h3 className="section-title">Content worth creating</h3>
      <div className="content-ideas">
        {seo.supporting_content.map((idea) => (
          <article className="card" key={idea.title}>
            <div className="card-top">
              <Pill>{idea.content_type}</Pill>
              <Pill tone={idea.priority === "high" ? "orange" : ""}>
                {idea.priority} priority
              </Pill>
            </div>
            <h3>{idea.title}</h3>
            <p>{idea.rationale}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function Services({ report }: Props) {
  return (
    <div className="animate-in">
      <PanelHeading
        eyebrow="THE CORE OFFERING"
        title="What this business does best."
        description="Services identified in the website content, with source excerpts you can inspect."
      />
      <div className="services-grid">
        {report.analysis.top_services.map((service) => (
          <article className="card service-card" key={service.name}>
            <div className="card-top">
              <span className="service-icon">
                <Layers3 size={21} />
              </span>
              <Pill
                tone={
                  service.evidence_status === "observed" ? "green" : "orange"
                }
              >
                {service.evidence_status === "observed"
                  ? "Source matched"
                  : "Inferred suggestion"}
              </Pill>
            </div>
            <h3>{service.name}</h3>
            <p>{service.description}</p>
            <div className="service-detail">
              <span>For</span>
              <strong>{service.target_customer}</strong>
            </div>
            <div className="service-detail">
              <span>Industry</span>
              <strong>{service.target_industry}</strong>
            </div>
            <div className="benefit">
              <Sparkles size={16} />
              <p>{service.main_benefit}</p>
            </div>
            {service.evidence.length > 0 && (
              <details className="evidence">
                <summary>
                  <BookOpen size={15} /> View source evidence{" "}
                  <ChevronDown size={15} />
                </summary>
                {service.evidence.map((evidence, index) => (
                  <blockquote key={index}>
                    “{evidence.quote}”
                    <cite>
                      {evidence.source_id} · matched to extracted text
                    </cite>
                  </blockquote>
                ))}
              </details>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export function Audience({ report }: Props) {
  const audience = report.analysis.target_audience;
  return (
    <div className="animate-in">
      <PanelHeading
        eyebrow="PEOPLE BEHIND THE SEARCH"
        title="Know who you’re speaking to."
        description="Audience hypotheses based on the business, its services, and the language on its website."
      />
      <div className="audience-summary card">
        <div>
          <span className="small-label">PRIMARY AUDIENCE</span>
          <Tags values={audience.primary_audience} />
        </div>
        <div>
          <span className="small-label">SECONDARY AUDIENCE</span>
          <Tags values={audience.secondary_audience} />
        </div>
        <div>
          <span className="small-label">GEOGRAPHIC FOCUS</span>
          <p>
            <Globe2 size={16} /> {audience.geographic_focus}
          </p>
        </div>
      </div>
      <div className="audience-grid">
        {audience.segments.map((segment, index) => (
          <article className="card persona" key={segment.name}>
            <div className="card-top">
              <span className={`persona-icon color-${index % 3}`}>
                <Users size={28} />
              </span>
              <Pill>Inferred profile</Pill>
            </div>
            <h2>{segment.name}</h2>
            <span className="persona-type">{segment.business_type}</span>
            <p>{segment.profile}</p>
            <span className="small-label">WHAT THEY NEED</span>
            <BulletList items={segment.needs} />
            <span className="small-label">WHAT INTERESTS THEM</span>
            <Tags values={segment.interests} />
            <div className="marketing">
              <span className="small-label">HOW TO REACH THEM</span>
              <p>{segment.marketing_approach}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="two-col">
        <article className="card">
          <h3>Relevant business segments</h3>
          <Tags values={[...audience.industries, ...audience.business_types]} />
        </article>
        <article className="card">
          <h3>Customer needs & challenges</h3>
          <BulletList items={audience.customer_needs} />
        </article>
      </div>
    </div>
  );
}

function safeLink(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function Sources({ report }: Props) {
  return (
    <div className="animate-in">
      <PanelHeading
        eyebrow="SHOW YOUR WORK"
        title="A report you can look behind."
        description="Review the extracted text and the limitations before acting on recommendations."
      />
      <div className="notice">
        <ShieldCheck size={19} />
        <p>
          “Source matched” means an excerpt was found in the fetched text. It
          does not independently verify the website’s claims or the model’s
          interpretation.
        </p>
      </div>
      <div className="sources-list">
        {report.sources.map((source) => (
          <article className="card" key={source.id}>
            <div className="card-top">
              <span className="source-label">
                <FileText size={20} /> {source.id}
              </span>
              <Pill>{source.word_count.toLocaleString()} words</Pill>
            </div>
            <h3>{source.title || "Untitled page"}</h3>
            {report.metadata.is_demo ? (
              <span className="source-url">
                {source.url} · fictional fixture
              </span>
            ) : (
              <a
                href={safeLink(source.url)}
                target="_blank"
                rel="noreferrer"
                className="source-url"
              >
                {source.url} <ExternalLink size={14} />
              </a>
            )}
            <details>
              <summary>
                Read extracted content <ChevronDown size={15} />
              </summary>
              <pre className="source-text">{source.text}</pre>
            </details>
          </article>
        ))}
      </div>
      <article className="card limitations">
        <h3>What to keep in mind</h3>
        <BulletList items={report.limitations} />
      </article>
      <div className="report-metadata">
        <span>Model: {report.metadata.model}</span>
        <span>
          Input tokens:{" "}
          {report.metadata.input_tokens?.toLocaleString() ?? "Not available"}
        </span>
        <span>
          Output tokens:{" "}
          {report.metadata.output_tokens?.toLocaleString() ?? "Not available"}
        </span>
        <span>
          Thinking tokens:{" "}
          {report.metadata.thinking_tokens?.toLocaleString() ?? "Not available"}
        </span>
        <span>Request: {report.metadata.request_id}</span>
      </div>
    </div>
  );
}
