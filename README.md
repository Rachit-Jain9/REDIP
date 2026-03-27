# REDIP

REDIP is a Real Estate Development Intelligence Platform for Indian development and capital-markets workflows. It combines pipeline management, property intelligence, underwriting context, spatial analysis, comparable tracking, and a Bengaluru-first intelligence brief scaffold.

## Stack

- Frontend: React 18, Vite, React Router, React Query, Zustand, Tailwind, Recharts, Leaflet
- Backend: Node.js, Express, PostgreSQL, JWT auth
- Deployment: Vercel serverless wrapper via [api/index.js](C:/Users/rachi/OneDrive%20-%20UW/Desktop/REDIP/api/index.js)

## Core product areas

- Deal pipeline management with flexible stage transitions
- Property management with optional early-stage data capture
- Land pricing workflow with per-acre, per-sqft, and total-price entry
- Activity tracking with completion, priority, filtering, and editing
- Document uploads tied to live deals
- Side-by-side opportunity comparison
- Map intelligence with clustering, comps overlays, and stage heat layers
- Dashboard metrics, city distribution, and recent activity
- Verified-data daily real estate intelligence readiness for Bengaluru and India

## Local setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally or a hosted PostgreSQL connection string

### Install

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

### Database

For a fresh database:

```powershell
cd backend
npm run migrate
npm run seed
```

For an existing database, apply incremental SQL from `database/migrations/` instead of rerunning the full schema.

### Start the app

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-redip.ps1 check
powershell -ExecutionPolicy Bypass -File .\run-redip.ps1 fullstack
```

Or run them separately:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-redip.ps1 backend
powershell -ExecutionPolicy Bypass -File .\run-redip.ps1 frontend
```

## Environment variables

### Backend

Copy `backend/.env.example` to `backend/.env`.

Required:

- `DATABASE_URL`
- `JWT_SECRET`

Optional:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `CORS_ORIGINS`
- `MAX_FILE_SIZE_MB`
- `ALLOWED_FILE_TYPES`

### Frontend

Copy `frontend/.env.example` to `frontend/.env`.

- `VITE_API_URL=/api` for local Vite proxying

## Testing and verification

Backend:

```powershell
cd backend
npm test
```

Frontend:

```powershell
cd frontend
npm run build
```

## Deployment

- GitHub remote: `https://github.com/Rachit-Jain9/REDIP.git`
- Vercel project linkage is stored in `.vercel/project.json`
- Production app URL: `https://redip.vercel.app/`

Production env vars to set in Vercel:

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `CORS_ORIGINS=https://redip.vercel.app`

## Seed data note

REDIP no longer ships with demo business data. `npm run seed` is a no-op confirmation step so local and production environments do not get polluted with mock deals, properties, comps, or activities. The recommended local path is to register a real user and add verified records through the app.
