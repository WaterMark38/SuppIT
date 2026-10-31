# SuppIT – clean Phase 4 Next.js project

This is a **clean single Next.js project**, combining the uploaded React frontend with the relational Prisma/Neon backend scaffold. The original source folder has **not** been modified or deleted.

## Phase 4 architecture
- Presentation: React client component in `src/components/SuppITApp.jsx` (original appearance retained).
- Application: Next.js API routes in `src/app/api`, with server-side auth and business rules.
- Database: Prisma 6 relational schema in `prisma/schema.prisma` → Neon PostgreSQL.
- Deployment: Vercel; Docker optional for local development.

## Before starting
1. Create a fresh folder and extract this ZIP. **Do not extract over the old `code` directory.**
2. From old project, copy **only your own image** `public/logo.png` into this project's `public/logo.png`. It was not supplied with the uploaded code. A fallback WM logo is displayed until then.
3. In Neon, choose the `Suppit-development` branch, rotate the previously shared DB password if not already done, and copy the pooled and direct connection strings.
4. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`. Do not send `.env` to anyone or commit it.
5. Run the development setup below.

## Start with Node.js and WebStorm
```powershell
npm install
npx prisma generate
npx prisma validate
npm run dev
```
Open http://localhost:3000/api/health to check the API and http://localhost:3000 for the UI.

## Or start with Docker Desktop
```powershell
docker compose up --build -d
docker compose ps
docker compose logs --tail=60 app
```
Docker uses the `.env` file at the project root and contacts Neon over the network. The container is named `suppit-phase4-app`. Stop any older app already occupying localhost port 3000 before starting this project. It does **not** create a local PostgreSQL container.

## Initial database creation (new EMPTY development DB only)
For a fresh development database with no application data or existing schema, and only after you have verified the selected database and branch:
```powershell
docker compose exec app npx prisma migrate dev --name suppit_initial
```
If the app is running locally outside Docker use `npx prisma migrate dev --name suppit_initial` instead. **Never run an initial migration blindly against a production database.**

## Create an administrator
Run in an interactive terminal (do not copy the password into this file):
```powershell
docker compose exec app npm run admin:create
```
Log in with the **administrator email address**, not the old demo username. The frontend has no built-in demo login credentials.

## Features and current limitations
- Current React screens: quotation, order, customer, supplier and stock screens; quotation PDF preview and email preparation; admin password reset.
- Customer, supplier, stock and draft quotation operations in the React UI are mapped to *relational* Prisma models through scoped Next.js API endpoints.
- Accepted quotation → order occurs via a server transaction preserving descriptions and prices. Direct manual order creation is disabled.
- Server API routes include the Phase 4 invoice, payment, reminder and reporting operations.
- The React UI now includes invoice creation from orders, payment-entry prompts, reminder checks and a basic reporting screen connected to backend APIs. These are initial implementations, not yet end-to-end tested against Neon or polished as final submission screens.
- The legacy browser-data import only handles contacts and stock; manually inspect data before importing.
- E-mail via the default mail app uses `mailto:`; downloaded PDFs cannot be attached automatically by a browser.
- Do not add the example customers, suppliers, products or credentials from the original prototype to a production database without review.
- A new invoice is created server-side before the UI allows preview. The original quotation/ invoice print styling is preserved; it still needs final reconciliation with database totals and tax handling.
- Full integration has **not** been tested against your live Neon database.

## Do not retain duplicate build systems
The old Vite `index.html`, `vite.config.js`, `main.jsx`, old Express `api/` and `server/`, `front/`, `Dockerfile.frontend` and `Dockerfile.backend` are NOT included. They are not required to run this Next.js project. `node_modules/`, `.next/`, `.idea/` and `.env` are generated locally; do not include them in your submission ZIP.

Keep the old `code` folder backed up until the replacement has been tested.
