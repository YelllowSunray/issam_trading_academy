# TradingAcadamy — Journal & P&L

Next.js rebuild of the Trading Journal Dashboard: MT5 sync, manual journal entries, annotations, and a live P&L dashboard. All data lives in Firebase (Firestore + Storage).

## Stack

- Next.js (App Router) + React
- Firebase Admin → Firestore + Storage
- MetaTrader 5 Expert Advisor (`mt5/JournalSyncEA.mq5`)

## Setup

### 1. Firebase Admin credentials

1. Open [Firebase Console](https://console.firebase.google.com/) → project `issam-trading-aca`
2. Project settings → Service accounts → **Generate new private key**
3. Copy `.env.example` to `.env.local` (already started) and set either:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

or:

```bash
FIREBASE_PROJECT_ID=issam-trading-aca
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@issam-trading-aca.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=issam-trading-aca.firebasestorage.app
```

Enable **Firestore** and **Storage** in the Firebase console if not already on.

### 2. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Optional: seed old MT5 JSON into Firestore

```bash
npm run seed:mt5
```

### 4. MetaTrader 5

1. Copy [`mt5/JournalSyncEA.mq5`](mt5/JournalSyncEA.mq5) into `MQL5/Experts/`
2. Compile in MetaEditor (F7)
3. Allow WebRequest for `http://127.0.0.1:3000`
4. Attach the EA to a chart with AutoTrading on
5. Keep `npm run dev` (or `npm start`) running so the API receives trades/heartbeats

If you set `MT5_INGEST_SECRET` in `.env.local`, set the same value on the EA input `IngestSecret`.

## API

| Route | Role |
|---|---|
| `POST /api/mt5-trade` | EA trade upsert |
| `POST /api/heartbeat` | EA account heartbeat |
| `GET /api/accounts` | Account list |
| `GET /api/trades?login=` | MT5 trades |
| `GET /api/status?login=` | Connection status |
| `GET/POST /api/manual-trades` | Manual journal trades |
| `DELETE /api/manual-trades/[id]` | Delete manual trade |
| `GET/PUT /api/annotations/[tradeId]` | MT5 annotations |
| `GET/PUT /api/settings` | UI prefs (selected account) |
| `POST /api/uploads` | Screenshot → Storage |

## Notes

- The old Python bridge (`Trading-Journal-Dashboard--main/Mt5ServerBridgeMac.py`) is no longer required.
- Nothing is stored in `localStorage`; everything goes through Firebase via the Next.js API.
# issam_trading_academy
