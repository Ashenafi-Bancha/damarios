# DaMarios Garment and Skill Training Center · website and business system

One system for **DaMarios Garment and Skill Training Center** (Wolaita Sodo, Ethiopia). Brand colors: blue and white.

The business has two parts:

1. **Production**: garment production and spice production, for local and international markets.
2. **Skill training center**: fashion design, culinary arts, and beautification (makeup and hairdressing).

- **Public website**: both divisions, a product catalog, a wholesale and export enquiry form (quotations in ETB or USD), the three training departments with their courses, an online training application form, gallery, news and graduates, and contact details. It includes a 3D hero, smooth scrolling and animations, and English / አማርኛ / Wolayttatto language switching.
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

You need Node.js 20+ and either Docker Desktop or your own PostgreSQL.

**1. Database**

```bash
docker compose up -d
```

(Or use your own PostgreSQL: create a `damarios` database and put its address in `backend/.env` as `DATABASE_URL`.)

**2. Backend** (API on http://localhost:4000)

```bash
cd backend
cp .env.example .env        # then fill in the values (skip if .env already exists)
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

`db:seed` creates the owner account from `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` in `backend/.env`, default role permissions, settings, website text and some sample business data. Use `SEED_SAMPLE=false npm run db:seed` for a clean start without sample data.

**3. Frontend** (website on http://localhost:3000, admin on http://localhost:3000/admin)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The website still shows sample content if the API is not running, so the design can be shown without a database.

## How things connect

- The browser only talks to the Next.js app. Next forwards `/api/*` and `/uploads/*` to the Express API (see `frontend/next.config.mjs`), so the login cookie works without CORS issues.
- Login uses an httpOnly cookie with a signed token (12 hours). Every admin route checks the user's role against the permissions set in **Users & roles**. The owner always has full access.
- The order form on the website creates a **website request**. In **Orders › Website requests**, staff turn it into a customer and an order with one click. Model casting requests also appear in **Recruitment**.
- Recording production output updates the work order. When a work order is finished, its order moves to **Quality check**. Piece-rate pay is calculated from these records.
- Payroll is calculated per Ethiopian month. The pension and tax rates come from **Settings › Payroll & tax**. **The tax brackets are empty on purpose**: the accountant must confirm the current rates before the first payroll.
- Stock in / stock out changes the quantity on hand in the same database transaction. Stock can't go below zero.
- Uploaded images (JPG, PNG, WebP only, random file names) are stored in `backend/uploads/`.
- Optional Telegram alerts: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `backend/.env`.

## Before going live

- Set a long random `JWT_SECRET` and `NODE_ENV=production`, and serve everything over HTTPS.
- Run `npm run db:deploy` (not `migrate dev`) on the server, and back up the database daily.
- Have a native speaker check the Amharic labels in `frontend/src/lib/i18n.ts`, and add Wolayttatto text in the admin's Website content screen.
- Replace the placeholder text in [brackets] and upload real photos from the admin panel.
- Confirm the payroll tax brackets and pension rates with the accountant.
