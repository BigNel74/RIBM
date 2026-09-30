# Deploying RIBM Revenue Spine OS

**Goal:** put the app on the internet so you can run a real prospect through it: evidence → diagnosis → QA → client report link.

**Tested:** these exact commands were rehearsed on 2026-09-30 from a fresh clone against an empty PostgreSQL database:

- migrations applied, framework seeded, admin created
- health check returned OK
- a restart was idempotent
- sign-in lockout, user creation, and client portal access all worked

---

## 1. What the app needs from any host

| Need | Value |
|---|---|
| Runtime | Node.js 22 (minimum 20.9). `.node-version` pins 22. |
| Database | PostgreSQL 14 or newer. |
| Build command | `npm ci && npm run build` |
| Start command | `npm run start:prod`. It runs `prisma migrate deploy`, then the idempotent seed, then `next start`. |
| Port | The host's `PORT` variable. Next.js reads it automatically. |
| Health check | `GET /api/health` returns `{"ok":true}` when the app and database are up. |
| Persistent disk | Required for evidence uploads. Mount it and point `STORAGE_DIR` at it. |
| Instances | **Exactly one.** The login lockout and the evidence files live on that one instance (DECISIONS ADR-018). |
| HTTPS | Terminated by the host. Session cookies are `Secure` in production, so plain HTTP logins will not work. |

### Environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | The database's **internal** connection string. |
| `STORAGE_DIR` | A folder on the persistent disk, e.g. `/var/data/storage`. |
| `SEED_ADMIN_EMAIL` | Your login email. |
| `SEED_ADMIN_PASSWORD` | A strong password of at least 12 characters, used once. **Remove it after the first login** (step 3.4). |
| `SEED_ADMIN_NAME` | Your name as shown in the app. |

**Do not set `NODE_ENV`.** `next start` sets it itself. Setting it before the build would skip packages the build needs.

---

## 2. Recommended host: Render

Render is recommended because it keeps the app, the Postgres database, and the persistent disk in one account, all managed from the dashboard. Nothing needs to run on your computer.

> Plan names, prices, and screen labels change. **Check Render's current pricing before choosing plans.** Two constraints matter:
> - A persistent disk requires a paid web-service plan.
> - Client data should not sit on a free or time-limited database.
>
> This session could not reach render.com to confirm current details.

1. **Account.** Sign up at render.com and connect GitHub. Grant access to `BigNel74/RIBM` only.
2. **Database.** Choose **New → PostgreSQL**.
   - Name: `ribm-db`.
   - Region: US East, closest to Atlanta.
   - Plan: a paid plan with automatic backups.
   - After it is created, copy the **Internal Database URL**.
3. **Web service.** Choose **New → Web Service** and select `BigNel74/RIBM`, branch `main`.
   - Runtime: **Node**. Region: **same as the database**.
   - Build command: `npm ci && npm run build`
   - Start command: `npm run start:prod`
   - Instance type: a paid instance. Disks need one, and free instances sleep.
   - Health check path: `/api/health`
   - **Disk:** mount path `/var/data`, size 1 GB. Evidence screenshots are small.
   - **Environment:** add the five variables from §1. Use `STORAGE_DIR=/var/data/storage` and paste the Internal Database URL as `DATABASE_URL`.
4. **Deploy.** The first deploy runs migrations and creates your admin account. When the log shows `Admin … created` and `Ready`, open the service URL.

## 3. First login checklist (about 10 minutes)

1. **Sign in** at `https://<your-service>.onrender.com/login` with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
2. **Record the framework adoption.** Go to **Settings → Record founder adoption of RS-FW-2.1** and write your statement (DECISIONS C-02).
3. **Set a new password.** In **Settings → your user → Set password**, choose a new one. This signs you out; sign back in.
4. **Remove `SEED_ADMIN_PASSWORD`** from the Render environment and save.
   - The seed skips admin creation when the variable is absent.
   - Your account is unaffected.
5. **Optional: custom domain.** Add e.g. `app.runitbacmedia.com` in Render, then create the CNAME record it shows at your DNS provider.

## 4. Running your first real prospect

1. **Clients → New client**, then **Opportunities → New opportunity** with a dated next action.
2. Qualify the opportunity once decision authority is known and the demand source is meaningful.
3. **Diagnostics → New diagnostic.** Work through the tabs in this order:
   - Intake
   - Evidence (screenshots are fine)
   - Five zones
   - 15 sections
   - Findings
   - Exposure (only with client-provided values)
   - Priority plan
   - Summary
4. **QA & report → Run QA.** Fix whatever the checklist names, then run it again.
5. **Prepare & publish client report.**
6. **Settings → Add user.** Role: **Client**. Link the client and give them a temporary password.
7. Send the client the login URL plus their credentials. **Send the password separately from the link.** They land on their portal and open the report on their phone, or print it to PDF.

## 5. Operating notes

- **Backups.** Confirm your Postgres plan's backup retention in Render. Evidence files are on the disk; check whether your plan snapshots disks. If it doesn't, download important screenshots, or move files to object storage (ADR-015's storage module is the single place to change).
- **Redeploys.** Every push to `main` redeploys. Migrations run automatically at start, and the seed never overwrites existing framework versions, offers, or users.
- **Access.** Deactivating a user in Settings signs them out everywhere. The same applies to password resets.
- **Not yet built (Phase 7):**
  - login-lockout storage shared across instances (single instance until then)
  - Content-Security-Policy headers
  - self-service password change
  - email delivery of report links
  - data-retention controls

## 6. Other hosts

Any host that meets §1 works: for example Railway (service + Postgres + volume) or Fly.io (app + Postgres + volume). Use the same build command, start command, and environment variables. Mount the volume and point `STORAGE_DIR` at it. Keep one instance.
