# Deployment

The production image serves React and FastAPI from one origin. Public deployment needs your Gemini key and hosting account. No live URL is claimed until deployment is performed and checked.

## Render

1. Open [Deploy to Render](https://render.com/deploy?repo=https://github.com/Rohit-998/Dxora) and connect the repository.
2. Review `render.yaml`: one Docker service, free plan, `/health` health check.
3. Set the secret `GEMINI_API_KEY`. The default model is `gemini-3.5-flash-lite`.
4. Deploy. The Blueprint generates a separate `ANALYSIS_API_KEY`. Retrieve it from the service settings, enter it in the UI's **Connection settings**, and share it privately with reviewers. Never share the Gemini key. Remove the app key only if deliberately choosing an open demo.
5. Verify the public HTTPS URL, `/docs`, `/health`, and a live analysis. Liveness alone does not prove provider authentication/quota.

Render uses the Dockerfile and honors `PORT`. GitHub checks gate automatic deploys. Free-host cold starts may affect the first request; check the experience before the interview. [Blueprint reference](https://render.com/docs/blueprint-spec), [FastAPI deployment guide](https://render.com/docs/deploy-fastapi).

Same-origin requests need no additional CORS entry. A separate UI host requires an exact `ALLOWED_ORIGINS` JSON list and an adapted frontend API base/proxy.

## Docker

After creating `.env`, run `docker compose up --build`, or:

```bash
docker build -t aperture:local .
docker run --rm --env-file .env -p 4000:4000 aperture:local
```

Compose uses a read-only root filesystem, temporary `/tmp`, dropped capabilities, and a non-root user. Stop it with `docker compose down`.

Put a TLS reverse proxy in front of a public container. Trust forwarded client IPs only from a known proxy. Use one worker for this scope: multiple replicas need shared cache/rate limits and an outbound firewall.

## Verify

```bash
curl -f https://YOUR-HOST/health
curl -f https://YOUR-HOST/openapi.json
curl -X POST https://YOUR-HOST/link-analysis \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: YOUR-APP-ACCESS-KEY' \
  -d '{"url":"https://www.python.org/"}'
```

Use your actual hostname/app key. Inspect all five sections, sources, matched excerpts, limitations, and `metadata.is_demo=false`. Export the report and record actual usage/latency. Repeat the URL to check `cached=true`. Check invalid/private addresses.

## Troubleshooting

- `/health` separates liveness (`status`) and key presence (`configured`); it neither exposes the key nor calls Gemini.
- `provider_auth`: check permissions. `provider_rate_limit`: check quota/billing. `provider_error`: verify model availability/request support.
- JavaScript-only, blocked, non-HTML, oversized, or compression-only pages may be unavailable. Try content-rich public HTML.
- Restart after editing `.env`; build React before starting the production server.
- Logs omit source text, URLs, and raw provider responses. Avoid verbose HTTP client logging in production.
- Public website text is sent to Google through the backend; review the provider's current data terms/API tier.
