# Aperture · Website intelligence

A FastAPI + React application built for the Dxora Python practical test. Turn a public website into an evidence-aware brand, competitor, search, SEO, services, and audience report using Google Gemini.

## Implementation milestones

- [x] Repository, configuration, and architecture foundation
- [ ] Secure extraction and validated Gemini analysis API
- [ ] React research workspace and sample report
- [ ] Automated verification, deployment packaging, and model research

Work is committed and pushed at working milestones. See [architecture](docs/architecture.md) for the implementation boundaries and decisions. Setup instructions will be completed with the runnable application.

## Core contract

`POST /link-analysis` on port `4000`, body `{"url":"https://example.com"}`. The response contains the five sections required by the assignment. Interactive API documentation is available at `/docs`.

API keys stay on the Python server. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` when ready. Never put credentials in `VITE_*` environment variables.
