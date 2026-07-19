# Putting Stockline online for free

This guide walks through hosting Stockline somewhere other than your own
computer, using free hosting services, so you (or your team) can reach it
from any device.

**Read this section before picking an option — it will save you a headache
later.**

## The one thing you need to understand first

Stockline stores its data (products, sales history, orders) in a single
file using SQLite. This is great for running the app on your own computer,
because there's nothing extra to set up. But most **free** hosting plans in
2026 don't let a web app keep its own files permanently — every time the
free service restarts (which can happen daily, after periods of
inactivity, or during a redeploy), any local files are wiped and the app
goes back to its starting sample data.

This isn't a bug in Stockline — it's how free web hosting tiers work almost
everywhere (Render, Railway, Fly.io, Cyclic, and others all work this way
for their no-cost plans).

So, pick based on what you actually need:

| You want to... | Best option |
|---|---|
| Show someone a working demo, or try it out yourself online | **Option A** below — 100% free, data resets on restart |
| Actually run your shop's real inventory data online, long-term | **Option B** — a few dollars a month for a place to permanently store data |

There's no dishonest way around this: if you need your real data to survive
indefinitely and you want to pay nothing at all, ongoing, that combination
isn't realistically available for a database-backed app in 2026. The good
news is Option B costs very little (around $5–7/month) and takes 10 extra
minutes to set up.

---

## Option A — Fully free, single service on Render (best for demos)

This deploys the backend and frontend together as one service. It's the
simplest path and costs nothing, but remember: **the database resets
whenever the free service restarts or redeploys.** Fine for testing,
showing people the app, or short-lived use — not for keeping real business
records long-term.

### 1. Put your project on GitHub

Render deploys from a GitHub repository.

1. Create a free account at [github.com](https://github.com) if you don't
   have one
2. Create a new repository (the "+" icon top-right → "New repository")
3. Upload your `stockline` folder to it — the easiest way if you're not
   familiar with git is GitHub's "uploading an existing file" web
   interface, or ask whoever set up this project to push it for you

### 2. Create the Render service

1. Create a free account at [render.com](https://render.com)
2. Click **New → Web Service** and connect your GitHub repository
3. Fill in the settings:
   - **Root Directory:** leave blank (we'll build both folders via the
     build command below)
   - **Build Command:**
     ```
     cd client && npm install && npm run build && cd ../server && npm install
     ```
   - **Start Command:**
     ```
     cd server && npm start
     ```
   - **Instance Type:** Free
4. Under **Environment Variables**, add these (same idea as your local
   `.env` file):
   - `ADMIN_USERNAME` — creates your first login the very first time the
     app starts (see note below)
   - `ADMIN_PASSWORD` — same — pick something real, not the example default
   - `JWT_SECRET` — a long random string (generate one locally with
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `CLIENT_ORIGIN` — leave this blank or set it to your Render URL once
     you know it (e.g. `https://stockline.onrender.com`) — this deployment
     serves the frontend from the same service, so it's not strictly
     required, but setting it tightens security
   - `ANTHROPIC_API_KEY` — optional, only if you want the AI assistant (see
     the "AI assistant" section below)
5. Click **Create Web Service**

Render will build and deploy the app, then give you a URL like
`https://stockline.onrender.com`. Open it and log in with the username/
password you set above — that's your first admin account. From there, add
teammates from **Settings → Team** inside the app itself rather than editing
environment variables again.

> **On the free tier specifically:** `ADMIN_USERNAME`/`ADMIN_PASSWORD`
> re-create the first admin account **every time the service restarts**,
> because the database resets too (see the persistence note at the top of
> this guide). That means any extra team accounts you added through
> Settings → Team will also disappear on restart, along with product data.
> This is another reason Option A is best treated as a demo — Option B
> (persistent disk) is what makes team accounts actually stick.

### What to expect on the free tier

- The app "spins down" after 15 minutes without traffic. The next visit
  takes about a minute to wake back up — this is normal, not an error.
- Render currently grants 750 free hours a month per account, which easily
  covers one always-available service.
- Any data entered (new products, sales recorded, orders placed) is lost
  whenever the service restarts or you deploy a change. It reseeds with the
  sample data each time.

---

## Option B — Real persistence, a few dollars a month

Same setup as Option A, with one change: attach a **persistent disk** so
your SQLite file survives restarts.

1. Follow Option A's steps 1–2, but choose the **Starter** instance type
   instead of Free (roughly $7/month at time of writing — check Render's
   current pricing page, as prices change)
2. In the Render dashboard for your service, go to **Disks → Add Disk**
   - **Mount Path:** `/opt/render/project/src/server/data`
   - **Size:** 1 GB is more than enough for a long time
3. Add an environment variable so the app writes its database inside that
   disk:
   - `DB_PATH` = `/opt/render/project/src/server/data/inventory.db`
4. Redeploy. Now your data survives restarts and redeploys.

This is the realistic, low-cost way to run Stockline for actual day-to-day
business use. If a monthly cost isn't an option at all, Option A is still
useful — just recognize it's a demo, not a system of record.

*(If you'd rather self-host on a cheap VPS like a $5/month Hetzner or
DigitalOcean droplet instead of Render, the same idea applies: install
Node.js 22+, copy the project over, run `npm install` and `npm start` in
`server`, and put the built `client/dist` behind the same service. A
persistent disk isn't a concern there since a VPS's storage is yours
permanently.)*

---

## Option C — Split hosting: Netlify or Vercel (frontend) + Render (backend)

If you specifically want to use Netlify or Vercel — they're excellent,
genuinely free hosts, but only for the **frontend** (the part with no
database). You'll still need a backend host like Render for the API and
database, using Option A or B above for that half.

### 1. Deploy the backend first (Option A or B above)

Note the URL Render gives you, e.g. `https://stockline-api.onrender.com`.

### 2. Deploy the frontend to Netlify

1. Create a free account at [netlify.com](https://netlify.com)
2. **Add new site → Import an existing project**, connect your GitHub repo
3. Settings:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
4. Under **Site settings → Environment variables**, add:
   - `VITE_API_BASE_URL` = `https://stockline-api.onrender.com/api`
     (your backend URL from step 1, with `/api` on the end)
5. Deploy. Netlify gives you a URL like `https://your-app.netlify.app`

### 2 (alternative) — Deploy the frontend to Vercel instead

1. Create a free account at [vercel.com](https://vercel.com)
2. **Add New → Project**, import your GitHub repo
3. Settings:
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**, add the same `VITE_API_BASE_URL` as
   above
5. Deploy.

### 3. Connect the two

Go back to your Render backend service and set:
- `CLIENT_ORIGIN` = `https://your-app.netlify.app` (or your Vercel URL)

This tells the backend to accept requests from your frontend's exact
address — without it, the browser will block the requests for security
reasons (CORS).

Redeploy the backend for the change to take effect.

---

## Setting up the AI assistant on any host

The "Ask Stockline" chat feature works the same way in production as
locally: it's controlled entirely by whether `ANTHROPIC_API_KEY` is set.

1. Get a key from [console.anthropic.com](https://console.anthropic.com)
2. Add it as an environment variable named `ANTHROPIC_API_KEY` in your
   host's dashboard (Render, or wherever your backend runs) — never put it
   in a file you upload to GitHub
3. Redeploy. The chat button appears automatically once the key is valid.

Usage of this feature is billed by Anthropic to whichever account owns the
API key — check current pricing at anthropic.com before enabling it for a
busy team.

---

## Before you show this to anyone else — a short checklist

- [ ] Changed `ADMIN_PASSWORD` from the default before first launch (it only
      sets the *first* login — after that, manage accounts from Settings →
      Team, ideally giving each real person their own login)
- [ ] Set a real random `JWT_SECRET` (not the example placeholder)
- [ ] Confirmed `.env` is **not** committed to GitHub (it's covered by
      `.gitignore` already, but double-check if you set things up manually)
- [ ] Decided which persistence option (A or B) actually matches how you'll
      use this — don't find out the hard way that a week of sales data
      disappeared
- [ ] If you enabled the AI assistant, you're comfortable with your
      inventory data being sent to Anthropic's API on each question asked

---

## Custom domain (optional)

Both Render and Netlify/Vercel let you attach your own domain name
(e.g. `inventory.yourshop.com`) for free — look for **Custom Domains** in
each service's dashboard once deployed. You'll point your domain's DNS at
the host following their on-screen instructions; it typically takes a few
minutes to a few hours to become active.
