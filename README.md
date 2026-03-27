# REDIP - Real Estate Development Intelligence Platform

A full-stack web application for real estate development professionals in India. Analyze, manage, and track real estate development deals with financial modeling, property management, and project intelligence features.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Query, Zustand, Recharts, Leaflet
- **Backend**: Node.js, Express, PostgreSQL, JWT Authentication
- **Deployment**: Vercel (serverless)

## Features

- Deal pipeline management with stage tracking
- Property management with map visualization
- Financial modeling (NPV, IRR, sensitivity analysis)
- Comparable property analysis
- Document management (Supabase storage)
- Activity tracking and dashboards
- CSV/PDF export
- Role-based access control (admin, analyst, viewer)

## Local Development

### Prerequisites

- Node.js >= 18
- PostgreSQL

### Setup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Set up database
cd ../backend
npm run migrate
npm run seed

# Start development servers
npm run dev:all
```

### Environment Variables

Copy `.env.example` to `.env` in both `backend/` and `frontend/` directories and configure:

**Backend** (`backend/.env`):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `SUPABASE_URL` / `SUPABASE_KEY` - For file storage (optional)

**Frontend** (`frontend/.env`):
- `VITE_API_URL` - API base URL (default: `/api`)

## Deployment

Deployed on Vercel. Environment variables must be configured in the Vercel dashboard:

- `DATABASE_URL` - Hosted PostgreSQL connection string
- `JWT_SECRET` - Production JWT secret
- `NODE_ENV` - `production`
- `CORS_ORIGINS` - Your Vercel deployment URL

## Test Users (after seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@redip.in | admin123 | Admin |
| analyst@redip.in | analyst123 | Analyst |
| viewer@redip.in | viewer123 | Viewer |
