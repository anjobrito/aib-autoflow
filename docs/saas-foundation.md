# AJB AutoFlow SaaS Foundation

This document tracks the first SaaS foundation step for AJB AutoFlow.

## Goal

Move the project from a localStorage MVP toward a real SaaS foundation without breaking the current UI or business-profile segmentation.

## Current branch

`feature/saas-foundation-prisma-postgres-auth`

## Scope of this foundation

- PostgreSQL through Prisma
- Company as tenant
- User linked to Company
- Session linked to User and Company
- Subscription linked to Company
- Password hash stored as `passwordHash`
- Company-level indexes on operational data
- Health endpoint for database connection
- Authentication endpoints and pages in the next step

## Required environment variables

Create `.env.local` locally and configure the same values in Vercel later.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
```

## Local setup

```bash
npm install
npx prisma generate
npx prisma migrate dev --name saas_foundation
npm run build
npm run dev
```

## Validation

Open:

```txt
http://localhost:3000/api/health/db
```

Expected result when the database is available:

```json
{"success":true,"database":"ok"}
```

## Statute

- Do not change `main` directly.
- Keep this branch focused on the SaaS foundation.
- Do not rewrite the UI layout.
- Keep localStorage screens working while migration is gradual.
- Use complete files for code changes.
- Keep commits in English.

## Migration order after auth foundation

1. Customers by `companyId`
2. Vehicles by `companyId`
3. Services by `companyId`
4. Products by `companyId`
5. Work orders by `companyId`
6. Finance and commissions
7. Reminders
8. Financing and liens
