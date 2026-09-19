# TradingAcadamy — Journal & P&L

Multi-tenant trading journal for the academy: students each have their own journal; Issam is both a trader and admin. Data lives in Firebase (Auth + Firestore + Storage). MT5 syncs via Next.js API routes with a per-user ingest secret.

## Features

- Firebase Auth (email/password + Google)
- Per-user Journal + P&L dashboard
- Manual trades, SMC tags, notes, screenshots
- MT5 sync (multi-account) with per-user secrets
- CSV export of filtered P&L rows
- Admin: list users, disable accounts, read-only coach view of a student journal

## Setup

### 1. Firebase

1. Enable **Authentication** (Email/Password + Google) in Firebase Console
2. Enable **Firestore** and **Storage**
3. Deploy security rules (deny client access — Admin SDK only):

```bash
npx firebase deploy --only firestore:rules,storage --project issam-trading-aca
```

4. Put Admin credentials + web config in `.env.local` (see `.env.example`)
5. Set `ADMIN_EMAILS` to Issam’s login email(s)
6. For production Google login: Firebase Console → **Authentication** → **Settings** → **Authorized domains** → add `tradechain.me` (and `www.tradechain.me` if you use it). `localhost` is already allowed by default.

### 2. App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the academy homepage.
Journal lives at [/journal](http://localhost:3000/journal) (login required).

### 3. MT5

1. In **Instellingen**, generate an ingest secret
2. Copy [`mt5/JournalSyncEA.mq5`](mt5/JournalSyncEA.mq5) into `MQL5/Experts/`, compile
3. Set EA inputs:
   - `TradeURL` = `http://127.0.0.1:3000/api/mt5-trade` (or your Vercel URL)
   - `HeartbeatURL` = `.../api/heartbeat`
   - `IngestSecret` = the secret from Settings
4. Allow WebRequest for that origin in MT5 options

### 4. Optional data import

After Issam has logged in once (so his `uid` exists):

```bash
TARGET_UID=<issam-uid> npm run seed:mt5
# or migrate old root-level Firestore docs:
TARGET_UID=<issam-uid> npm run migrate:user
```

## Deploy (Vercel)

1. Push the repo and import into Vercel
2. Add the same env vars as `.env.local`:
   - All `NEXT_PUBLIC_FIREBASE_*`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
   - `ADMIN_EMAILS`, billing vars
3. **`FIREBASE_PRIVATE_KEY` tip:** paste the key with literal `\n` newlines. In the Vercel UI, do **not** wrap the whole value in extra `"..."` quotes (that commonly causes API `500`s).
4. Custom domain: `https://tradechain.me` (optional env `NEXT_PUBLIC_APP_URL=https://tradechain.me`)
5. In Firebase → Authentication → Authorized domains, add `tradechain.me` and `www.tradechain.me`
6. Deploy (redeploy after changing env vars)
7. Check `https://tradechain.me/api/health` — should return `{ "ok": true }`
8. Update EA URLs + WebRequest allowlist to `https://tradechain.me`
9. Telegram Login Widget: BotFather `/setdomain` → `tradechain.me`

## Security model

- UI uses Firebase Auth ID tokens (`Authorization: Bearer …`)
- Journal APIs are scoped to `users/{uid}/…`
- Admins may pass `?asUser=` for read-only coaching
- MT5 POSTs require `x-mt5-secret` mapped to a user
- Firestore/Storage rules deny all client access

## Firebase budget kill-switch (€10)

The app **self-meters** Firestore/Storage ops it performs (reads/writes/deletes/uploads), estimates cost with a safety buffer, and auto-locks when the estimate reaches `BILLING_BUDGET_EUR` (default €10). No Google Cloud budget alert is required for this to work.

Counters live in `system_usage/{yyyy-mm}` and reset each UTC month.

When locked:
- All journal/MT5 APIs return `503 billing_exceeded`
- Students see a blocked screen
- Admins see WhatsApp-Samir instructions + estimated usage + unlock after payment

**Caveat:** the meter is an **estimate of our Admin SDK traffic**, not the exact Google invoice (console usage, free-tier quirks, other GCP services won’t match 1:1). It’s intentionally a bit conservative.

Optional extras:
- GCP Budget alert → `POST /api/billing/budget-alert`
- Manual lock/unlock on **Admin**
- `BILLING_HARD_STOP=true`

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local Next.js |
| `npm run build` | Production build |
| `npm run seed:mt5` | Import JSON store into a user |
| `npm run migrate:user` | Move legacy root collections into a user |
