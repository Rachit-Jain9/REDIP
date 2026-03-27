## REDIP Project Instructions

REDIP is not a generic CRM. It is an investor-facing real estate development intelligence platform for India, with Bengaluru as the primary intelligence market.

### Product priorities

- Optimize for sourcing, screening, underwriting, IC preparation, and pipeline clarity.
- Keep forms realistic for incomplete live data.
- Preserve high-trust, institutional UX.
- Use explicit units and Indian number formatting where relevant.
- Never ship demo, mock, fabricated, or hallucinated business data as if it were real.

### Local workflow

- Use `run-redip.ps1` from the repo root for local startup.
- Use `database/schema.sql` for a clean DB and `database/migrations/` for incremental patches.
- Frontend builds from `frontend/` and backend runs from `backend/`.
- Vercel serves the React app from `frontend/dist` and the API through `api/index.js`.

### Important domain conventions

- Property name and address are not always known at first contact.
- Land pricing may be entered as total price, INR per acre, or INR per sqft.
- Area may be entered in acres or sqft and should normalize consistently.
- Deal stages and valid transitions are centrally defined in `backend/src/constants/domain.js`.
- Archived deals should disappear from primary pipeline views without corrupting historical activity or documents.
- External market intelligence must be verified-data-only. If sources are not configured, REDIP should surface truthful readiness messaging instead of generated market claims.

### Change discipline

- When touching a workflow, inspect the whole chain:
  - form inputs
  - client validation
  - API payload
  - service logic
  - SQL reads/writes
  - dashboard aggregates
  - compare/map/documents side effects
- Prefer robust refactors over one-off UI patches.
- Do not reintroduce hard requirements that make early sourcing harder.

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
