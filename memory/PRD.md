# TechGarage — Product Requirements Document

## Original Problem Statement
User uploaded a single-file HTML app "TechGarage" (Repair Tracker for mobile & tablet repair shops, localStorage-based with Google Sheets/Supabase sync) and asked to rebuild it "to the level it is unrecognisable" — a sell-ready subscription SaaS with improved functionality, premium UI, and a proper landing page.

## User Choices
- Auth: Email + Password (JWT)
- Subscription: Plans UI only (no live payments)
- Notifications: SMS (Twilio) — simulation mode until creds added
- Design: Modern dark, techy, premium (neon cyan/volt on matte black)
- Currency: Multi-currency / configurable

## Architecture
- Frontend: React 19 (CRA/craco), react-router, recharts, sonner, lucide-react, Tailwind (custom "Cyber-Premium" theme; Unbounded/Manrope/JetBrains Mono fonts)
- Backend: FastAPI, Motor (MongoDB), JWT (PyJWT) + bcrypt, Twilio
- DB: MongoDB, multi-tenant (every record scoped by shop_id = user id)

## Personas
- Repair shop owner/technician managing device repair jobs, inventory, sales, and customer comms.

## Implemented (2026-07-04)
- Marketing landing page (hero, brand marquee, stats, features, workflow, 3-tier pricing with animated Pro card, testimonials, CTA).
- JWT auth: register (creates shop + seeded catalog), login, me, logout, change-password. Demo account auto-seeded with 65 jobs + 6 products.
- Dashboard: 6 KPIs, 7-day revenue area chart, top-brands pie, recent jobs.
- Repair Jobs: full CRUD, filters (status/brand/payment/search), rich job form (IMEI, brand/model, lock, SIM, problem/part tag pickers with add-new, financials), detail view with print ticket + SMS (received/ready) + edit/delete.
- Inventory: product CRUD, stats (products/units/stock value/low stock), barcode scan-to-stock, POS (new sale) with stock deduction.
- Settings: shop profile, multi-currency selector, SMS templates, ticket footer, plan display.
- Catalog: per-shop brand-models/problems/parts, extendable in-app.
- Testing: iteration_1 — backend 25/25 pytest pass, all frontend flows pass.

## Backlog / Next
- P1: Wire live Twilio (collect ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER from user).
- P1: Live subscription billing (Stripe) if user wants real payments.
- P2: Staff/multi-user seats (decouple shop_id from user id), roles.
- P2: Photo uploads for jobs (object storage), CSV export/backup, sales report page.
- P2: next-job-number based on max(job_no) rather than count.
