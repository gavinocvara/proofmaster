# ProofMaster Pro v2 — MAT3013 Study Suite

> Richard Hammack, *Book of Proof* Ed. 3.3 · §1.1 → §2.6  
> Wolfram Alpha verification · Interactive truth tables · Progress tracking

---

## Deploy to Vercel in 5 Steps

### 1. Install prerequisites (one-time)
```bash
node --version   # Need v18+. Download from nodejs.org if missing.
npm install -g vercel
```

### 2. Install dependencies
```bash
cd proofmaster-deploy
npm install
```

### 3. Test locally
```bash
npm run dev
# Opens at http://localhost:5173
# Note: Wolfram won't work locally unless you also run the proxy (step below)
```

### 4. Deploy to Vercel
```bash
vercel
# Follow the prompts:
#   Set up and deploy? → Y
#   Which scope? → your account
#   Link to existing project? → N
#   Project name? → proofmaster (or anything)
#   Directory? → ./  (just press Enter)
#   Want to override? → N
```

Vercel gives you a live URL like `https://proofmaster-xyz.vercel.app` ✓

> **Important (prevents `NOT_FOUND`)**  
> This repository's app lives in the `proofmaster-deploy/` folder.  
> If you import from GitHub, set **Project Settings → General → Root Directory** to `proofmaster-deploy`.  
> If Root Directory is left at the repo root, Vercel can deploy without your app files and return `NOT_FOUND`.

### 5. Add Wolfram Alpha AppID (server-side, secure)

1. Get a **free** AppID at https://developer.wolframalpha.com/  
   (Click "Get an AppID" → create an app → copy the key)

2. In Vercel dashboard:  
   **Your Project → Settings → Environment Variables → Add New**
   ```
   Key:   WOLFRAM_APP_ID
   Value: YOUR-APPID-HERE
   ```
   Select **Production + Preview + Development** then click Save.

3. Redeploy so the env var takes effect:
   ```bash
   vercel --prod
   ```

4. Test: Open your live URL → ⚙ Settings → 🧪 Test Connection  
   Should show: ✓ Connected! (2 + 2 = 4)

---

## Troubleshooting `NOT_FOUND` on Vercel

If your deployment URL shows `NOT_FOUND`, verify:

1. **Root Directory** is `proofmaster-deploy`
2. **Build Command** is `npm run build`
3. **Output Directory** is `dist`
4. Your latest commit includes `vercel.json` with SPA rewrite + API route handling

Then trigger a redeploy.

---

## File Structure

```
proofmaster-deploy/
├── api/
│   └── wolfram.js        ← Vercel serverless proxy (hides your AppID)
├── src/
│   ├── App.jsx           ← Full React app (1800+ lines)
│   └── main.jsx          ← React entry point
├── index.html            ← HTML shell
├── package.json          ← Dependencies
├── vite.config.js        ← Build config
├── vercel.json           ← Routing rules
└── README.md             ← This file
```

---

## How the Wolfram Proxy Works

```
Browser                     Vercel Edge              Wolfram API
   │                             │                        │
   │  GET /api/wolfram?q=...     │                        │
   │────────────────────────────▶│                        │
   │                             │  GET /v1/result?       │
   │                             │  appid=SECRET&i=...    │
   │                             │───────────────────────▶│
   │                             │        "4"             │
   │                             │◀───────────────────────│
   │       { result: "4" }       │                        │
   │◀────────────────────────────│                        │
```

Your `WOLFRAM_APP_ID` **never reaches the browser**. Users cannot extract it.

---

## Sharing the App

Once deployed, share your Vercel URL with classmates. It works on:
- Desktop & mobile browsers
- No login or install required
- Progress is per-session (resets on refresh by design)

---

## Local Dev with Wolfram Proxy

To test Wolfram locally, create `.env.local` in the project root:
```
WOLFRAM_APP_ID=your-appid-here
```
Then run:
```bash
vercel dev
# Starts both the React app AND the serverless functions locally
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Hosting | Vercel (free tier) |
| Wolfram proxy | Vercel Serverless Function (Node.js) |
| Styling | Inline styles (zero deps) |
| Data | Hammack, *Book of Proof* Ed. 3.3 |

---

*Product by Gavino Vara ©2026*
