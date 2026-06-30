# Fordham CPS Referral Directory

A clean, searchable web directory for Counseling & Psychological Services (CPS) staff to find and manage off-campus mental health provider referrals for students.

## Features

- **Deduplicated provider records** — one entry per provider with merged insurance lists (no more duplicate rows per insurance tab)
- **Rich search & filters** — insurance, provider type, session format (in-person/virtual), specialties, low-cost options, accepting clients
- **Provider profiles** — websites (practice, Psychology Today, Alma, Headway), contact info, address, modalities, licensed states, descriptions
- **Staff comments** — add dated notes signed with your name (e.g., student feedback, verification updates)
- **Staff editing** — update accepting status, active/inactive, session format, and description

## Quick start

```bash
npm install
cp .env.example .env.local   # set STAFF_PASSWORD
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default staff password (change in production): `fordham-cps-staff`

## Data

Provider data is seeded from your Google spreadsheet export (`data/providers.seed.json`). To re-extract from the PDF:

```bash
pip install pypdf
npm run extract
npm run db:reset
npm run dev
```

## Deployment

Set environment variable:

```
STAFF_PASSWORD=your-secure-password
```

Deploy to Vercel, Railway, or any Node.js host. The SQLite database is created automatically on first run.

## Project structure

```
data/providers.seed.json   # Seed data (48 deduplicated providers)
scripts/                   # PDF extraction & refinement
src/app/                   # Next.js pages & API routes
src/components/            # UI components
src/lib/                   # Database & auth
```

## For CPS staff

1. Use filters to narrow by student insurance and needs
2. Click a provider card for full details and website links
3. Sign in with staff password to add comments or mark providers inactive
