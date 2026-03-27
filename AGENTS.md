# REDIP Agent Guide

REDIP is a full-stack real estate development intelligence platform for Indian development and capital-markets workflows, with Bengaluru as the highest-priority market for intelligence features.

## Product Focus

- Keep workflows practical for live sourcing, underwriting, IC prep, and pipeline management.
- Favor partial-data entry over blocking forms. Real-world sourcing is incomplete.
- Default to high-trust, investor-grade UI copy and formatting.
- Bengaluru-first intelligence, India-second.
- Do not ship or reintroduce demo, mock, fabricated, or hallucinated business data.

## Stack

- Frontend: React 18, Vite, React Router, React Query, Zustand, Tailwind, Recharts, Leaflet
- Backend: Express, PostgreSQL, JWT auth, multer uploads
- Deployment: Vercel serverless wrapper in [api/index.js](C:/Users/rachi/OneDrive%20-%20UW/Desktop/REDIP/api/index.js)

## Local Commands

- Health check: `powershell -ExecutionPolicy Bypass -File .\run-redip.ps1 check`
- Start backend: `powershell -ExecutionPolicy Bypass -File .\run-redip.ps1 backend`
- Start frontend: `powershell -ExecutionPolicy Bypass -File .\run-redip.ps1 frontend`
- Start both: `powershell -ExecutionPolicy Bypass -File .\run-redip.ps1 fullstack`
- Apply schema baseline to a fresh DB: `cd backend && npm run migrate`
- Seed data: `cd backend && npm run seed`
- Run backend tests: `cd backend && npm test`
- Build frontend: `cd frontend && npm run build`

## Database Notes

- Use `database/schema.sql` for clean database creation.
- Use `database/migrations/` for patching an existing local database.
- `database/seed.sql` intentionally inserts no demo business records.
- `deals.is_archived` is the main dead-deal/archive control. Avoid hard delete unless the record is already archived or clearly terminal.
- `properties.property_type`, land pricing fields, and geocode metadata are part of the live workflow now.
- `intelligence_briefs` stores verified-data readiness output and future daily intelligence snapshots.

## Domain Rules

- Property `name` and `address` can be unknown during early sourcing. Never force them unless the workflow truly requires them.
- `circle_rate`, `fsi`, and pricing inputs must support decimals cleanly.
- Deal stages must flow through the configured transition map in `backend/src/constants/domain.js`.
- The intelligence layer must never invent external market facts. If verified sources are missing, show an explicit not-configured state instead.
- Land pricing supports:
  - total price in crore
  - INR per sqft
  - INR per acre
- Area input supports sqft and acres and should always normalize to sqft for persistence/calculation.

## Backend Architecture

- Route files are thin validation layers.
- Business logic belongs in `backend/src/services/`.
- Shared workflow enums/constants live in `backend/src/constants/domain.js`.
- Reusable calculation logic belongs in `backend/src/utils/`.
- If a change affects forms, also inspect:
  - validation rules
  - SQL queries
  - dashboard aggregates
  - archive/delete behavior
  - map sync/geocoding behavior

## Frontend Architecture

- API clients live in `frontend/src/services/api.js`.
- React Query hooks live in `frontend/src/hooks/`.
- Page-level workflows are in `frontend/src/pages/`.
- Formatting/domain display helpers live in `frontend/src/utils/`.
- Keep compare, map, dashboard, deals, properties, activities, and documents aligned with backend filters and enums.

## QA Expectations

- For workflow changes, verify at least:
  - create property
  - create deal
  - link/unlink property and deal
  - archive/restore/delete deal behavior
  - activity create/edit/complete/delete
  - dashboard stats
  - documents deal selector
  - map location sync
- Do not claim a workflow works unless it has been exercised through API or UI.

## Deployment Notes

- Git remote: `origin -> https://github.com/Rachit-Jain9/REDIP.git`
- Vercel project is already linked in `.vercel/project.json`
- Keep serverless compatibility intact: backend must export the Express app without assuming long-lived background processes on Vercel.
