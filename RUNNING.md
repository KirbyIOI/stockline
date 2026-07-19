# Running Stockline on your computer

This guide assumes no prior experience. Follow the steps in order and you'll
have Stockline running in your web browser in about 10 minutes. It works the
same way on Windows, Mac, and Linux — the only difference is where you type
commands.

You'll be using something called a **terminal** (also called "Command Prompt"
on Windows, or "Terminal" on Mac). It's just a window where you type commands
instead of clicking icons. Every command below is something you type and then
press Enter.

---

## Step 1 — Install Node.js

Stockline needs a program called **Node.js** to run. Think of it as the
engine the app runs on.

1. Go to **[nodejs.org](https://nodejs.org)**
2. Download the version marked **LTS** (this stands for "Long Term Support" —
   it's the stable, recommended one)
3. Run the installer you downloaded and click Next/Continue through the
   default options
4. Restart your computer once it finishes (this makes sure everything is set
   up correctly)

**Check it worked:** Open a terminal and type:

```
node -v
```

You should see something like `v22.5.0` or higher. If you see "command not
found" or "not recognized," restart your computer and try again — the
installer sometimes needs a restart to take effect.

> Stockline needs Node.js version **22.5 or newer**. If `node -v` shows a
> lower number, download the latest LTS version from nodejs.org again.

**How to open a terminal:**
- **Windows:** Click Start, type `cmd`, press Enter
- **Mac:** Press `Cmd + Space`, type `Terminal`, press Enter

---

## Step 2 — Get the project files onto your computer

If you received Stockline as a `.zip` file:

1. Find the downloaded `.zip` file (usually in your Downloads folder)
2. Right-click it and choose **Extract All** (Windows) or double-click it
   (Mac) to unzip it
3. Move the extracted `stockline` folder somewhere easy to find, like your
   Desktop or Documents folder

If you received it as a GitHub link instead, download it as a ZIP from
GitHub's green "Code" button → "Download ZIP," then follow the same steps.

---

## Step 3 — Open a terminal inside the project folder

This is the step people usually get stuck on, so here are two ways:

**Easy way:** Open the `stockline` folder in your file browser, then:
- **Windows:** Click the address bar at the top, type `cmd`, press Enter
- **Mac:** Right-click the folder → Services → "New Terminal at Folder"
  (if you don't see this option, use the manual way below)

**Manual way:** Open a terminal normally, then type `cd ` (with a space
after it), drag the `stockline` folder into the terminal window, and press
Enter. This fills in the correct folder path for you.

Check you're in the right place by typing:

```
dir        (on Windows)
ls         (on Mac/Linux)
```

You should see two folders listed: `server` and `client`.

---

## Step 4 — Set up the backend (the part that stores your data)

In your terminal, type each of these lines one at a time, pressing Enter
after each:

```
cd server
npm install
```

`npm install` downloads everything the backend needs to run. This can take a
minute or two — you'll see a lot of text scroll by, that's normal.

Next, create your settings file. This file holds your login password and a
few other private settings, so it's kept separate from the main program.

**Windows:**
```
copy .env.example .env
```

**Mac/Linux:**
```
cp .env.example .env
```

Now open the new `.env` file in a text editor (Notepad, TextEdit, VS Code —
anything works) and change these two lines to your own values:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
```

These create your **first login** the very first time the app starts —
after that, you can add more team members and change passwords from inside
the app itself (Settings → Team), and these two lines are no longer used.
Pick something only you know for now.

Also change this line to a random string of letters and numbers (it's used
to keep your login sessions secure — the exact value doesn't matter, it just
needs to be long and random):

```
JWT_SECRET=change-this-to-a-long-random-string
```

A quick way to generate one: in your terminal, type
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
and paste the result in.

Leave `ANTHROPIC_API_KEY` blank for now — that's for the optional AI
assistant feature, covered in Step 7.

Save the file and close it.

---

## Step 5 — Start the backend

Still inside the `server` folder in your terminal, type:

```
npm run dev
```

You should see:

```
Seeded 6 products with 14 weeks of sales history each.
Stockline API listening on http://localhost:4000
```

**Leave this terminal window open.** Closing it stops the backend. The first
time it runs, it fills the app with sample products so you have something to
look at right away.

> You'll also see a line like `SQLite is an experimental feature` — this is
> just a label Node.js puts on this particular feature; it works correctly
> and can be ignored.

---

## Step 6 — Start the frontend (the part you see in your browser)

Open a **second, new** terminal window (keep the first one running). Get
back into the project folder the same way as Step 3, then type:

```
cd client
npm install
npm run dev
```

After a few seconds you'll see something like:

```
Local:   http://localhost:5173/
```

Open your web browser and go to **http://localhost:5173** — you should see
the Stockline login screen. Sign in with the username and password you set
in Step 4 — this is the one-time setup for your first (admin) account, not
something you'll need to redo.

**That's it — Stockline is running.** Each time you want to use it again,
repeat Step 5 and Step 6 (you don't need to repeat Steps 1–4).

To stop the app, click into each terminal window and press `Ctrl + C`.

---

## Step 7 — Add your team (optional)

Everything after your first login happens inside the app itself — there's
nothing more to edit in `.env`.

1. Sign in and click **Settings** in the sidebar
2. Under **Business & forecasting**, set your company name, currency symbol,
   and forecasting method (Linear is the safe default; switch to Smoothed or
   Seasonal once you have a few weeks of real sales data — each option
   explains when it's the better choice)
3. Under **Team**, click **Add team member** to create a login for each
   person who needs access — give each person their own account rather than
   sharing one password. Choose **Admin** for people who should manage
   settings and accounts, or **Staff** for everyone else (staff can do
   everything with products, sales, and orders, just not change company
   settings or manage other accounts)
4. Anyone can change their own password from **Settings → Your account**

---

## Step 8 — Turn on the AI assistant (optional)

Stockline includes an "Ask Stockline" chat assistant that can answer
questions like *"what should I reorder this week?"* using your real
inventory data. It's off by default and the rest of the app works fine
without it.

1. Go to **[console.anthropic.com](https://console.anthropic.com)** and
   create an account
2. Create an API key (there's a clear "Get API Keys" or "Create Key" button
   in the console)
3. Open `server/.env` again and paste your key in:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
4. Save the file and restart the backend (go to its terminal window, press
   `Ctrl + C`, then run `npm run dev` again)

A small sparkle button will now appear in the bottom-right corner of the
app. Using this feature sends your product/stock data to Anthropic's API
each time you ask a question, and usage is billed by Anthropic based on your
account — check their pricing page before heavy use.

---

## Everyday use — the short version

Once you've done the setup above once, here's all you need going forward:

```
# Terminal 1
cd stockline/server
npm run dev

# Terminal 2 (separate window)
cd stockline/client
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## Troubleshooting

**"command not found: node" or "'node' is not recognized"**
Node.js isn't installed, or your computer needs a restart after installing
it. Redo Step 1.

**"Port already in use" or "EADDRINUSE"**
Something is already using port 4000 or 5173 — probably an old copy of
Stockline still running in another terminal window. Close all terminal
windows and start again from Step 5.

**The page loads but shows a login error / "Failed to fetch"**
Make sure the backend terminal (Step 5) is still open and shows "Stockline
API listening." If you closed it, restart it.

**I forgot my password**
If someone else on your team has an Admin account, the easiest fix is for
them to sign in and reset your password from **Settings → Team** (the key
icon next to your name). If you're the *only* account and you're locked
out, `ADMIN_USERNAME`/`ADMIN_PASSWORD` in `.env` only apply the very first
time the app ever starts — changing them later doesn't reset anything. To
truly start over: stop the backend, delete the `server/data` folder, and
start it again. This wipes **all** data (every product, sale, order, and
account) and recreates your first login from `.env` — there's no way to
recover what's deleted, so only do this if starting fresh is genuinely
okay.

**"There must be at least one admin — promote someone else first"**
Stockline won't let you remove or demote the last remaining admin account,
so you're never permanently locked out of managing the app. Promote another
account to Admin first if you need to change or remove the original one.

**I want to start over with fresh sample data**
Stop the backend, then in the `server` folder run:
```
npm run seed -- --force
```
This wipes all products, sales history, and orders and reseeds the sample
data. There's no undo — only do this if you're okay losing what's there.

**Nothing above fixed it**
Copy the exact error text from your terminal and search for it, or share it
with whoever set this app up for you — the error text almost always says
exactly what's wrong.

---

Once you're comfortable running Stockline locally, see **DEPLOYMENT.md** for
instructions on putting it online so you (or your team) can reach it from
any device, not just this one computer.
