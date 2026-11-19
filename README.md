# DaMarios Garment and Skill Training Center · website and business system

One system for **DaMarios Garment and Skill Training Center** (Wolaita Sodo, Ethiopia). Brand colors: blue and white.

The business has two parts:

1. **Production**: garment production and spice production, for local and international markets.
2. **Skill training center**: fashion design, culinary arts, and beautification (makeup and hairdressing).

- **Public website**: both divisions, a product catalog, a wholesale and export enquiry form (quotations in ETB or USD), the three training departments with their courses, an online training application form, gallery, news and graduates, and contact details. It includes a 3D hero, smooth scrolling and animations, and English / አማርኛ language switching.
- **Admin panel** (`/admin`):
  - **Sales and production:** dashboard, orders board with wholesale and export enquiries, customers, garment and spice production lines (pcs or kg), product catalog, inventory (fabric, raw and packed spices, training supplies).
  - **Training center:** website applications, classes, students, fees (also recorded in Finance) and printable certificates.
  - **People and business:** employees, attendance, leave and payroll in the Ethiopian calendar, recruitment, finance, website text, gallery and news, users and role permissions, settings.

```
da-marios/
├── backend/              Node.js + Express + Prisma (PostgreSQL)
│   ├── prisma/           schema.prisma (all tables) and seed.ts
│   └── src/
│       ├── lib/          auth, permissions, Ethiopian calendar, CRUD helper…
│       └── routes/       auth, public (website), admin/* (one file per area)
├── frontend/             Next.js 15 (React 19) + Tailwind + Framer Motion + three.js
│   └── src/
│       ├── app/          / (public site), /admin/login, /admin/(panel)/*
│       ├── components/   public/* (site sections, 3D hero), admin/* (shell, tables, forms)
│       └── lib/          API client, formatting, Ethiopian dates, sample content
└── docker-compose.yml    Local PostgreSQL on port 5436
```

## Run it locally

You need **Node.js 22** and **Docker Desktop** (or your own PostgreSQL).

**First time** (from the project folder):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm install
npm run setup
```

Fill in `backend/.env` before `npm run setup` (at least `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD`).
`setup` installs both apps, starts the database (Docker, port 5436), applies the migrations and seeds the starting data.

**Every day:**

```bash
npm run db:up
npm run dev
```

- Website: http://localhost:3000 · Admin: http://localhost:3000/admin (sign in with `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`)
- API: http://localhost:4000/api/health

`db:seed` creates the owner account, role permissions, settings, the website text (English and Amharic) and the starter
products, courses, gallery and news. The admin's business records start empty; `SEED_SAMPLE=true npm run db:seed`
(in `backend`) adds made-up records for trying things out (never in production).

**Changing the database:** edit `backend/prisma/schema.prisma`, then `cd backend && npx prisma migrate dev --name what-changed`,
and commit the new folder in `prisma/migrations`. Production applies it on the next deploy.

Other root commands: `npm run typecheck`, `npm run lint`, `npm run build`.

The website still shows sample content if the API is not running, so the design can be shown without a database.

## How things connect

- The browser only talks to the Next.js app. Next forwards `/api/*` and `/uploads/*` to the Express API (see `frontend/next.config.mjs`), so the login cookie works without CORS issues.
- Login uses an httpOnly cookie with a signed token (12 hours). Every admin route checks the user's role against the permissions set in **Users & roles**. The owner always has full access.
- The order form on the website creates a **website request**. In **Orders › Website requests**, staff turn it into a customer and an order with one click. Model casting requests also appear in **Recruitment**.
- Recording production output updates the work order. When a work order is finished, its order moves to **Quality check**. Piece-rate pay is calculated from these records.
- Payroll is calculated per Ethiopian month. The pension and tax rates come from **Settings › Payroll & tax**. **The tax brackets are empty on purpose**: the accountant must confirm the current rates before the first payroll.
- Stock in / stock out changes the quantity on hand in the same database transaction. Stock can't go below zero.
- Uploaded images (JPG, PNG, WebP only, checked by content, random file names) are stored in `backend/uploads/` locally and in DigitalOcean Spaces in production (`backend/src/lib/storage.ts`).
- Optional Telegram alerts: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `backend/.env`.

## Going live

Production runs on **DigitalOcean App Platform** (website, API, managed PostgreSQL, Spaces for photos) with the
domain **damariosgarment.com** from GoDaddy. Everything is described in [`.do/app.yaml`](.do/app.yaml), and
[DEPLOY.md](DEPLOY.md) walks through it step by step. The Vercel preview (demo mode, no database) stays available.

Still to do before launch:

- Have the owner check the Amharic text (interface text in the public components, section text in the admin's Website content screen).
- Replace the placeholder text in [brackets] and upload real photos from the admin panel.
- Confirm the payroll tax brackets and pension rates with the accountant.
