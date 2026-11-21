# Verification record

Verified on **21 November 2026**. These checks distinguish software correctness, real network extraction, and model quality.

## Local results

| Check | Result |
| --- | --- |
| Python tests | **53 passed** |
| Python statement coverage | **95%** across the application |
| Ruff lint and formatting | Passed |
| TypeScript and Vite production build | Passed |
| Chromium browser tests | **12 passed** |
| Automated accessibility | No WCAG A/AA violations reported by axe on the seven report tabs tested |
| Runtime browser errors in screenshot capture | None |
| Mobile layout | Checked at 390 × 844; no horizontal document overflow |
| Production npm dependencies | `npm audit --omit=dev`: 0 vulnerabilities at verification time |

Browser tests verify all report sections, search platform filters, source expansion, live-request wiring via a mocked response, history/reload/clear, JSON download, API error states, mobile navigation, keyboard tabs, settings dialog dismissal, and non-persistence of app access keys. Automated accessibility scans are useful checks, not a guarantee of complete accessibility compliance.

The backend tests cover network destination policy, all-address DNS validation, IP pinning/TLS hostname preservation, redirect blocking, download limits, non-HTML/compressed responses, extraction, partial crawl failures, provider payloads/failures/retries, evidence downgrade, strict platform coverage, request/auth/rate controls, caching, duplicate coordination, and concurrency admission.

## Actual external network check

Command from the project root with the Python environment active:

```bash
python -m scripts.smoke https://www.python.org/
```

Observed output:

```json
{
  "mode": "live_extraction_only",
  "llm_called": false,
  "pages": [
    {"url": "https://www.python.org/", "title": "Welcome to Python.org", "words": 336},
    {"url": "https://www.python.org/about/", "title": "About Python™ | Python.org", "words": 350},
    {"url": "https://www.python.org/about/apps/", "title": "Applications for Python | Python.org", "words": 443}
  ],
  "warnings": []
}
```

These counts describe the fetched pages at the time of the check and may change. This verifies real HTTPS fetching with public-IP pinning and multi-page extraction. It does not verify Gemini.

## Linux and container verification

[GitHub Actions](https://github.com/Rohit-998/Dxora/actions/workflows/ci.yml) installs dependencies, runs Python/browser checks, builds the Docker image, starts it, and verifies `/health`, the rendered frontend, and `/openapi.json`.

The first run found a Windows-specific sample decoding difference. Explicit UTF-8 decoding fixed it; the [following run passed all three jobs](https://github.com/Rohit-998/Dxora/actions/runs/44915293050). Subsequent commits continue through the same checks; consult the latest run for current-head status. Docker's local daemon was unavailable, so container execution was verified on the Linux CI runner.

## Still requires user configuration

- **Live Gemini response:** no configured Gemini key was available. The client payload, schema handling, validation, and errors are tested with mocked HTTP responses, but actual provider acceptance, quality, usage, latency, and quota remain to be checked.
- **Public deployment:** a host account and provider key are needed. Docker and Render configuration are included; no live URL has been invented.
- **Business accuracy:** competitor suggestions and audience interpretations have not been independently benchmarked.

After adding the key, run the API and use:

```bash
python -m scripts.smoke https://www.python.org/ --api-base http://localhost:4000
```

This invokes live analysis and consumes the configured provider quota. It validates the returned schema and requires `metadata.is_demo=false`. Inspect factual claims and record actual provider tokens and latency before submission.

## Screenshots

All screenshots show the explicitly fictional Forma sample, not a live Gemini response.

- [Desktop overview](screenshots/desktop.png)
- [SEO recommendations](screenshots/seo.png)
- [Mobile overview](screenshots/mobile.png)

To refresh captures, start the local API and Vite server, then run `node scripts/visual-check.mjs` from `frontend/`. It writes screenshots to `docs/screenshots/` and an ignored local accessibility diagnostic to `artifacts/local/`.
