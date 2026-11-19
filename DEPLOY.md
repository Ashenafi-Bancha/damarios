# Putting DaMarios online

| | What | Where | Data saved? |
|---|---|---|---|
| **Production** | The full system: website, admin panel, API, database, photos | **DigitalOcean App Platform** + domain **damariosgarment.com** from **GoDaddy** | Yes |
| **Preview** | Website + admin panel in demo mode, for showing the design | **Vercel**: https://damarios.vercel.app | No |

Part A is the production setup. Part B is the Vercel preview.

---

# A. Production: DigitalOcean + GoDaddy

## How it fits together

```
                         damariosgarment.com  (GoDaddy registers it; DNS hosted at DigitalOcean)
                                   │
                    DigitalOcean App Platform, app "damarios", Frankfurt
                    ┌──────────────┴───────────────┐
        /  (everything else)                /api/*  and  /uploads/*
                    │                              │
        web: Next.js (website + admin)      api: Express (REST API)
                    │  reads content over the       │
                    └── app's private network ──────┤
                                                    ├── Managed PostgreSQL "damarios-db" (daily backups)
                                                    └── Spaces bucket "damarios-media" + CDN (uploaded photos)
```

- One domain serves everything, so the admin login cookie is first-party and there is no CORS to worry about.
- The whole app is described in [`.do/app.yaml`](.do/app.yaml): components, routes, sizes, health checks,
  alerts and settings. Secrets are never in the repo; they are entered in the DigitalOcean control panel.
- Every push to `main` deploys by itself. Before each release a **release** job runs the database migrations.
  On the very first release it also creates the owner account and the website's starting content. It skips
  that as soon as any account exists, so live data is never overwritten.

## Monthly cost (approximate, check at checkout)

| Item | Size | Cost |
|---|---|---|
| web (Next.js) | `apps-s-1vcpu-1gb-fixed` | $10 / month |
| api (Express) | `apps-s-1vcpu-0.5gb` | $5 / month |
| release job | runs ~1 minute per deploy | a few cents |
| Managed PostgreSQL | Basic, 1 GB RAM, 10 GB disk, daily backups | $15 / month |
| Spaces + CDN | 250 GB storage and 1 TB transfer included | $5 / month |
| **Hosting total** | | **≈ $35 / month** |
| Domain (GoDaddy) | damariosgarment.com | first year discounted, then ≈ $22–23 / year |

Team members are free on DigitalOcean.

## Who does what

| Step | Who |
|---|---|
| 1. GoDaddy: account, buy the domain, invite the developer | **Dr. Senait** (her card) |
| 2. DigitalOcean: account, payment card, invite the developer | **Dr. Senait** (her card) |
| 3–9. Database, Spaces, DNS, app, secrets, domain, checks | **Ashenafi** (as an invited member) |

Card details are only ever entered by the owner, on the official GoDaddy and DigitalOcean sites.

---

## 1. GoDaddy: buy the domain (Dr. Senait)

1. Go to https://www.godaddy.com and **Sign In → Create an account**, with the DaMarios email.
2. Search **damariosgarment.com** → **Add to cart**.
3. At checkout:
   - Choose **1 year** (or more), and keep **auto-renew on** so the name is never lost.
   - **Untick the extras** (email, website builder, hosting, "full domain protection" bundles). We don't need them.
   - Pay with the card.
4. Invite the developer: account menu → **Account Settings → Delegate Access** →
   **People who can access my account → Invite to Access**. Enter Ashenafi's name and email and choose
   **Products & Domains** (lets him manage the DNS, not make purchases). He accepts from the email,
   with a free GoDaddy account of his own.

## 2. DigitalOcean: account and team (Dr. Senait)

1. Go to https://cloud.digitalocean.com/registrations/new and sign up with the DaMarios email.
2. Add the card under **Billing → Payment methods**. (DigitalOcean may ask for a small verification charge.)
3. Name the team **DaMarios** (**Settings → Team → Edit**).
4. Invite the developer: **Settings → Team → Invite Members**, enter Ashenafi's email, role **Member**.
   Members can create and manage everything; billing stays with the owner.

Everything below is done by Ashenafi, signed in to the **DaMarios** team (team switcher, top left).

## 3. Database: managed PostgreSQL

1. **Databases → Create Database Cluster**.
   - Engine **PostgreSQL 16** · Datacenter **Frankfurt (FRA1)**
   - Plan **Basic, Shared CPU, 1 GB RAM / 10 GB disk** ($15/month)
   - Name **`damarios-db`** (exactly this: the app spec refers to it).
2. When it is ready, open the **Users & Databases** tab → **Add new database** → **`damarios`**.
3. Daily backups are automatic (kept 7 days; **Backups** tab → restore to a new cluster if ever needed).
   Access is limited to the app automatically once the app is created ("Trusted sources").

## 4. Photos: Spaces bucket with CDN

1. **Spaces Object Storage → Create a Spaces Bucket**.
   - Datacenter **Frankfurt (FRA1)** · **Enable CDN** · Name **`damarios-media`** · File listing **Restricted**.
2. **Spaces Object Storage → Access Keys → Create Access Key**:
   - **Limited access**, bucket **damarios-media**, permission **Read/Write/Delete**, name `damarios-api`.
   - Copy the **Access Key** and the **Secret Key** now; the secret is shown only once. They go in step 6.

The app saves photos as `https://damarios-media.fra1.cdn.digitaloceanspaces.com/uploads/<random>.jpg`.

## 5. DNS: point the domain to DigitalOcean

DigitalOcean hosts the DNS, so the app creates and renews its own records and HTTPS certificate.

1. DigitalOcean: **Networking → Domains → Add Domain** → `damariosgarment.com` (team: DaMarios).
2. GoDaddy (via delegate access): **My Products → damariosgarment.com → DNS → Nameservers → Change Nameservers →
   I'll use my own nameservers**:
   ```
   ns1.digitalocean.com
   ns2.digitalocean.com
   ns3.digitalocean.com
   ```
3. The change takes from a few minutes to a few hours. Check with `nslookup -type=NS damariosgarment.com`.

> Email for the domain later (e.g. info@damariosgarment.com with Zoho or Google Workspace): add its MX/TXT
> records in DigitalOcean **Networking → Domains**, not at GoDaddy.

## 6. Create the app

**a. Let DigitalOcean read the GitHub repo.** **Apps → Create App → GitHub → Manage Access**, install the
DigitalOcean app on the **Ashenafi-Bancha/damarios** repository, then cancel the wizard (the spec does the rest).

**b. Create the app from the spec** with the `doctl` command-line tool:

```powershell
winget install DigitalOcean.Doctl        # or: https://docs.digitalocean.com/reference/doctl/how-to/install/
doctl auth init                          # paste a token: API → Tokens → Generate New Token (team DaMarios, full access)
cd C:\Users\Degu\Documents\da-marios
doctl apps create --spec .do/app.yaml
```

(Without doctl: **Apps → Create App**, pick the repo, create it, then **Settings → App Spec → Edit**, paste
`.do/app.yaml`, save.)

**c. The first deploy stops on purpose**: the secrets still say `SET_IN_DIGITALOCEAN_CONSOLE`, and the
release job and API refuse to start with them. Fill them in under **Apps → damarios → Settings**:

| Component | Key | Value |
|---|---|---|
| **api** | `JWT_SECRET` | 64 random characters: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **api** | `SPACES_KEY` | the Spaces access key (step 4) |
| **api** | `SPACES_SECRET` | the Spaces secret key (step 4) |
| **release** (job) | `SEED_OWNER_EMAIL` | Dr. Senait's login email for the admin panel |
| **release** (job) | `SEED_OWNER_PASSWORD` | a strong first password (12+ characters) |

Tick **Encrypt** for each secret, save, then **Actions → Force Rebuild and Deploy**.

**d.** Watch **Activity**: build → release job (migrations + first setup) → api and web start → **Deployed**.
The app answers at its own address, e.g. `https://damarios-xxxxx.ondigitalocean.app`, before the domain is ready.

> Don't run `doctl apps update --spec .do/app.yaml` on the live app: it would reset the secrets to the
> placeholders. Change settings in the control panel, or start from `doctl apps spec get <app-id>`.

## 7. Domain and HTTPS

Once the nameservers point to DigitalOcean (step 5), App Platform adds the records for
`damariosgarment.com` and `www.damariosgarment.com` and issues the HTTPS certificates by itself.
**Apps → damarios → Settings → Domains** shows **Active** when done (you also get a `DOMAIN_LIVE`/`DOMAIN_FAILED` email).

## 8. Check everything

- [ ] `https://damariosgarment.com/api/health` → `{"ok":true}` (API up, database reachable)
- [ ] `https://damariosgarment.com` → the website, real content, no "Sample content" note
- [ ] `https://damariosgarment.com/?lang=am` → the Amharic version
- [ ] `https://damariosgarment.com/admin/login` → sign in with the owner email and password from step 6
- [ ] Admin → **Website** → upload a photo → it shows, with an address on `damarios-media.fra1.cdn.digitaloceanspaces.com`
- [ ] Website → send a training application → it appears in Admin → **Training**
- [ ] `https://www.damariosgarment.com` → also works

## 9. Hand-over to Dr. Senait

1. Send her the admin address and her login **privately** (phone call or in person).
2. She signs in and sets a new password under **Users** (edit her own account).
3. She creates separate accounts for staff under **Users**, with only the roles they need.
4. Remove `SEED_OWNER_PASSWORD` from the release job afterwards (it is never used again once accounts exist).
5. In **Settings › Contact & social**, replace the placeholder phone numbers and add the real Telegram, WhatsApp
   (with country code, for customers abroad), email and social links. The website updates right away.
6. Optional: Telegram alerts (see Day-to-day), and which ones to receive in **Settings › Notifications**.

---

## Day-to-day

| Task | How |
|---|---|
| **Release a change** | Push to `main`. Build, migrations and zero-downtime switch-over happen by themselves. |
| **Database change** | `cd backend && npx prisma migrate dev --name what-changed` locally, commit the new migration folder, push. The release job applies it. |
| **Logs** | Apps → damarios → **Runtime Logs** (api / web) · release job logs under **Activity**. Or `doctl apps logs <app-id> api --follow`. |
| **Undo a bad release** | Apps → damarios → **Activity** → an earlier deployment → **Rollback**. (Database migrations are not undone.) |
| **Restore the database** | Databases → damarios-db → **Backups** → restore to a new cluster, then point the app's `db` component to it. |
| **Website text, products, courses, photos** | In the admin panel. No deploy needed; the website picks it up within a minute. |
| **Alerts** | Email on failed deploys, domain problems, and repeated API restarts (set in `.do/app.yaml`). |
| **Telegram alerts for new orders** (optional) | Add `TELEGRAM_BOT_TOKEN` (secret) and `TELEGRAM_CHAT_ID` to the **api** component. |

## If something goes wrong

| Symptom | Cause and fix |
|---|---|
| Deploy fails at **release** with "Set SEED_OWNER_…" | The release job secrets still have placeholders: step 6c. |
| api won't start: "The server settings are not valid" | A setting is missing or a placeholder; the log lists which one. |
| api won't start: "Photo storage is half set up" | Set all of `SPACES_ENDPOINT`, `SPACES_BUCKET`, `SPACES_KEY`, `SPACES_SECRET`. |
| Release fails: "Can't reach database server" | The cluster name isn't `damarios-db`, or database `damarios` doesn't exist (step 3). |
| Photo upload fails with 500 | Wrong Spaces key, or the key has no write access to `damarios-media`. |
| Photos upload but don't show | CDN not enabled on the bucket: Spaces → damarios-media → Settings → CDN. |
| Domain stays "Pending" | Nameservers not yet switched at GoDaddy, or still propagating (step 5). |
| Website shows old text right after a deploy | The home page refreshes its content every 60 seconds; reload after a minute. |

## Local development

See the README: `npm run setup` once, then `npm run db:up` and `npm run dev` from the project folder.
With the `SPACES_*` values empty, photos are saved in `backend/uploads/`.

## Built into the app spec

- **Ethiopian time** (`TZ=Africa/Addis_Ababa`) for the API, website and release job: cloud servers run on UTC, and
  attendance, "today" and Ethiopian months must follow local time.
- **`NEXT_PUBLIC_SITE_URL`** = https://damariosgarment.com for search engines and link previews (sitemap, robots.txt,
  share images). Every page names the main address as its official one, so search engines list damariosgarment.com
  rather than the temporary `*.ondigitalocean.app` address. The Vercel preview is kept out of search results entirely.

---

# B. Preview on Vercel (demo mode)

The website and the staff panel run on Vercel by themselves, with no API or database. Content comes from
`frontend/src/lib/demo-data.json`, a recording of the real API (English and Amharic website, empty staff panel).

- Project `damarios` on Vercel, **Root Directory `frontend`**, no environment variables needed: built on Vercel
  without a `BACKEND_URL`, the site switches to demo mode by itself (`NEXT_PUBLIC_DEMO=true`/`false` forces it).
- Every push to `main` redeploys it too. Vercel Web Analytics and Speed Insights run only there.
- Sample staff login: **admin@damarios.com** / **admin@2026!** (in `frontend/src/lib/demo.ts`; override with
  `NEXT_PUBLIC_DEMO_EMAIL` / `NEXT_PUBLIC_DEMO_PASSWORD`). It is part of the browser code, so it is not a secret;
  there is no real data behind it.
- Saving shows *"This is a preview: changes are not saved yet…"*; the public forms ask visitors to call or use Telegram.
- After changing website content locally, refresh the recording: `cd backend` → `npm run demo:record`
  (needs the local database and API running) → commit and push.

Once production is live, the preview can be kept for design reviews or removed in Vercel → Project → Settings.
