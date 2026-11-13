# Putting DaMarios online (prototype)

The project has three parts. Each goes to a free service that deploys straight from GitHub:

| Part | What it is | Where it goes |
|---|---|---|
| `frontend/` | Public website + staff panel (Next.js) | **Vercel** |
| `backend/` | API (Express) | **Render** |
| Database | PostgreSQL | **Neon** |

The browser only ever talks to the Vercel address. Vercel forwards `/api/...` to Render (see `frontend/next.config.mjs`),
so the staff login cookie works on the Vercel domain.

Sign in to all three with your GitHub account (Ashenafi-Bancha). None of them needs a credit card for the free plan.

---

## 1. Database: Neon

1. Go to https://neon.tech → sign up with GitHub → **Create project** (name `damarios`, region: Europe (Frankfurt) is closest to Ethiopia).
2. Copy the **connection string**. It looks like
   `postgresql://USER:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
   Keep it private: it contains the database password.

## 2. Fill the database (from your computer, once)

In a terminal, in the `backend` folder, point Prisma at Neon for this one session and create the tables and the starting content:

```powershell
cd C:\Users\Degu\Documents\da-marios\backend
$env:DATABASE_URL = "<the Neon connection string>"
$env:SEED_OWNER_EMAIL = "<the login email to give the owner>"
$env:SEED_OWNER_PASSWORD = "<a strong password, 12+ characters>"
npx prisma migrate deploy
npm run db:seed
```

This creates the **Admin** (owner) account with that email and password, the website text, and the starter
products, courses, gallery and news the public site shows. The staff panel's business records (orders, customers,
staff, students, stock, finance) start **empty**, ready for real data.

Close that terminal afterwards so the Neon address and the password do not stay in it. Your local `.env` is not changed.

## 3. API: Render

1. Go to https://render.com → sign up with GitHub → **New → Blueprint** → choose the `damarios` repository.
   Render reads `render.yaml` from the repo.
2. When it asks for the values:
   - `DATABASE_URL`: the Neon connection string
   - `FRONTEND_URL`: leave as `https://example.com` for now, you fix it in step 5
3. Click **Apply**. When the build finishes, open `https://damarios-api.onrender.com/api/public/site`
   (your exact address is shown at the top of the service). You should see JSON text.

## 4. Website and staff panel: Vercel

1. Go to https://vercel.com → sign up with GitHub → **Add New → Project** → import `damarios`.
2. **Root Directory**: click Edit and choose `frontend`. Framework: Next.js (detected).
3. **Environment Variables**: add `BACKEND_URL` = your Render address, e.g. `https://damarios-api.onrender.com`
   (no slash at the end).
4. Click **Deploy**. You get an address like `https://damarios.vercel.app`.

## 5. Connect them

On Render → `damarios-api` → **Environment** → set `FRONTEND_URL` to your Vercel address → Save (it redeploys).

## 6. Check

- `https://<your-vercel-address>/`: the website, with real text (no "Sample content" note at the bottom).
- `https://<your-vercel-address>/admin/login`: sign in with the email and password from step 2.

Every `git push` to `main` now redeploys the website (Vercel) and the API (Render) automatically.

---

## Good to know for the prototype

- **Render free plan sleeps** after 15 minutes without visitors; the first request then takes up to a minute.
  Before showing the site, open the Render `/api/public/site` address and wait for the JSON.
  If the first staff login shows an error, wait a few seconds and try again.
- **Photos uploaded from the staff panel** are stored on the Render server and are lost when it restarts or redeploys.
  The site's own photos (in `frontend/public/images`) are not affected. For real use, move uploads to cloud storage.
- **Website text** edited in the staff panel is saved in Neon and stays.
- **Sharing the login**: send the email and password to the owner privately (in person, phone or a direct message),
  not in a group or public post. She can then create separate accounts for staff under **Users**.
- Later, a custom domain (e.g. `damarios.com`) can be added in Vercel → Project → Settings → Domains.
