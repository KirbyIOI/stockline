# Switch from Anthropic/Claude to Google/Gemini API

## Steps
- [x] Analyze project structure and understand current Anthropic implementation
- [x] Present plan to user and get approval
- [x] Step 1: Modify `server/package.json` — replace `@anthropic-ai/sdk` with `@google/generative-ai`
- [x] Step 2: Rewrite `server/src/routes/assistant.js` — change API calls from Anthropic SDK to Gemini SDK
- [x] Step 3: Run `npm install` in the `server` folder to install the new dependency
- [x] Step 4: Fix `client/src/components/Modals.jsx` — missing `</span>` in PurchaseOrderModal
- [ ] Step 5: **YOU MUST DO MANUALLY** — Update Render environment variables:
  - **Remove:** `ANTHROPIC_API_KEY`
  - **Add:** `GEMINI_API_KEY` — paste your Gemini API key here
  - **Optional:** `GEMINI_MODEL` — defaults to `gemini-2.0-flash` if not set
