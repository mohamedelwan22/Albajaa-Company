# منصة البجع للسفر والسياحة

An internal staff platform for Al-Baja Travel & Tourism to manage flight tickets — upload original PDFs, extract and edit data, then generate branded Arabic PDFs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/albaja run dev` — run the frontend (port 24307)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `JWT_SECRET` — for signing JWTs
- Required env: `SUPABASE_SERVICE_KEY` — for Supabase storage access
- Required env: `SUPABASE_URL` — Supabase project URL
- Required env: `SUPABASE_BUCKET` — storage bucket name (default: "tickets")

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui (Arabic RTL, dark)
- API: Express 5 (artifact: api-server, port 8080, path /api)
- DB: PostgreSQL (Replit) + Drizzle ORM
- Storage: Supabase Storage (bucket: "tickets")
- PDF read: pdf-parse (text extraction from uploaded originals)
- PDF gen: Puppeteer (branded HTML → PDF)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB tables: companies, users, tickets
- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/` — generated React Query hooks (from Orval)
- `lib/api-zod/` — generated Zod schemas (from Orval)
- `artifacts/albaja/src/pages/` — frontend pages
- `artifacts/albaja/src/components/` — shared UI components
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — auth, supabase, pdf-reader, pdf-generator

## Architecture decisions

- Cookie-based auth (httpOnly JWT) — more secure than localStorage; `credentials: "include"` set in customFetch
- Supabase used only for file storage, not auth or DB — Replit PostgreSQL is the DB
- Puppeteer bundled in the API server for PDF generation (HTML template → PDF)
- Busboy used for multipart file uploads (no multer) to keep dep count low
- RTL enforced at document level (`<html dir="rtl">`) + Tajawal Arabic font

## Product

- Staff log in with email + password (JWT cookie session)
- Upload a flight PDF → text extracted automatically by pdf-parse
- Edit all ticket fields: passenger, flight, pricing, cabin class, baggage, etc.
- Toggle price visibility on the generated ticket
- Generate a branded PDF with company logo/colors, flight QR-style layout, travel notes
- Share PDF via WhatsApp or download directly
- Company settings: update name, colors, contact info, travel notes

## User preferences

- Arabic RTL UI throughout — no English UI text
- Brand colors: Primary #F7931E, Secondary #00AEEF, Background #1A1A1A
- No emojis in the UI
- Seed account: admin@albaja.com.iq / admin123

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing openapi.yaml
- Always run `pnpm --filter @workspace/db run push` after schema changes in lib/db
- Puppeteer install scripts are ignored (pnpm approve-builds) — the bundled chromium path must be passed explicitly if issues arise
- `credentials: "include"` must be set on all fetch calls for cookie auth to work through the Replit proxy
- `sameSite: "lax"` on the auth cookie works through the Replit reverse proxy

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
