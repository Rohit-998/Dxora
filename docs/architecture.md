# Architecture and decisions

## Boundaries

React (presentation) → FastAPI (HTTP contract) → analysis service (orchestration) → website extractor + Gemini client (external I/O). Pydantic owns the contract; dependencies are injectable for offline tests.

React uses TypeScript, locally bundled fonts, and native HTML controls. The checked-in sample is validated by the Python response model; browser tests use it at the HTTP boundary. The provider model is configurable, with `gemini-3.5-flash-lite` selected after current model-lifecycle research.

## Evidence before recommendations

Fetch a small, bounded set of public HTML pages. Extract headings, metadata, text, and useful internal links. Supply this evidence to Gemini as untrusted data. Require structured JSON and validate the response again on the server. Services reference exact source excerpts; unsupported claims become inferred suggestions. Competitors are explicitly unverified AI suggestions because this version has no independent search provider. Do not manufacture rankings or search volumes.

## Security design

Only HTTP(S), standard ports, and public addresses are accepted. Resolve and validate every destination, including redirects; pin connections to the validated IP while preserving the original TLS server name and Host header. Disable proxy environment inheritance. Limit redirects, bytes, pages, content, time, concurrency, and request frequency. Keep secrets out of browser bundles and logs.

## Deployment

One container builds React and serves it alongside FastAPI on port 4000. This avoids cross-origin deployment complexity. Local development uses Vite's API proxy. A bounded in-process TTL cache is sufficient for the assignment; multiple production replicas need shared rate limiting/cache (for example Redis) and an egress firewall.

The container runs as a non-root user. Render configuration enables a separate app access key by default. The key can be entered in the browser for a session; the Gemini provider key never leaves the server. GitHub Actions verifies Python, browser workflows, and a production container independently.

## Deliberate tradeoffs

- Static HTML extraction does not execute JavaScript or bypass access controls.
- A three-page budget favors responsiveness over exhaustive crawling.
- No invented numerical SEO score or competitor metrics.
- Sample reports are explicitly fixtures and never returned as a successful live analysis.
- No accounts/database are needed for this scope; report history stays in the current browser session.
- Model speed and accuracy remain unbenchmarked until a real key is configured and a labeled evaluation set is run.
