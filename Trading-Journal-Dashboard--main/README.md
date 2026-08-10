# Trading Journal Dashboard

Persoonlijk trading journal + P&L dashboard, gekoppeld aan MetaTrader 5. Trades worden automatisch gesynchroniseerd vanuit MT5 en live weergegeven in een dashboard met statistieken zoals P&L, winrate, drawdown, profit factor en een equity curve — met de mogelijkheid om per trade een eigen journal-entry (notities, setup, screenshot) toe te voegen.

## Architectuur

Het project bestaat uit drie lagen die samen de MT5 → dashboard pijplijn vormen:

```
MetaTrader 5 (Expert Advisor)
        │  schrijft trade data
        ▼
JournalSyncEA.mq5
        │
        ▼
Mt5ServerBridgeMac.py  ──▶  mt5_trades_store.json
        │  serveert data
        ▼
Trading-Journal-PnL.html  (frontend dashboard, in de browser)
```

| Bestand | Rol |
|---|---|
| `JournalSyncEA.mq5` | Expert Advisor die in MT5 draait en trade-data (opens, closes, SL/TP, volume, account) exporteert. |
| `Mt5ServerBridgeMac.py` | Lokale Python-bridge/server op macOS die de EA-output leest, normaliseert en beschikbaar maakt voor het dashboard. |
| `mt5_trades_store.json` | Lokale opslag/cache van gesynchroniseerde trades — de "bron van waarheid" die het dashboard uitleest. |
| `Trading-Journal-PnL.html` | Het dashboard zelf (single-page frontend): P&L overzicht, filters (datum/instrument/bron), equity curve, en de journal-view per trade. |

> ⚠️ **TODO (in te vullen door wie de bridge geschreven heeft):** exacte poort/protocol waarop `Mt5ServerBridgeMac.py` luistert, en hoe `Trading-Journal-PnL.html` daarmee praat (polling? websocket? leest hij `mt5_trades_store.json` rechtstreeks van disk?). Dit bepaalt ook de fix voor het account-bug hieronder.

## Setup

### Vereisten
- MetaTrader 5 (macOS of via Wine/parallel setup, afhankelijk van hoe `JournalSyncEA.mq5` gekoppeld is)
- Python 3.x voor de bridge
- Een moderne browser voor het dashboard

### Installatie
```bash
git clone https://github.com/cryptozayn/Trading-Journal-Dashboard-.git
cd Trading-Journal-Dashboard-
```

1. **Expert Advisor**: kopieer `JournalSyncEA.mq5` naar de `MQL5/Experts/` map van je MT5-installatie, herstart MT5, en koppel de EA aan een chart. Zorg dat "algorithmic trading" / auto-trading aan staat.
2. **Bridge**: start de lokale server die de EA-data opvangt en normaliseert naar `mt5_trades_store.json`:
   ```bash
   python3 Mt5ServerBridgeMac.py
   ```
   *(TODO: eventuele vereiste env vars, requirements.txt / dependencies, en het poortnummer hier toevoegen.)*
3. **Dashboard**: open `Trading-Journal-PnL.html` in de browser (dubbelklikken volstaat als het bestand direct van `mt5_trades_store.json` leest; via `file://` kunnen sommige browsers lokale JSON-fetches blokkeren — in dat geval de bridge ook als lichte HTTP-server laten serveren).

Het "MT5 niet verbonden" label in het dashboard geeft aan of de bridge actief is en recent data heeft ontvangen.

## Bekende issues

- **Verkeerde data bij meerdere accounts**: het dashboard toont op dit moment soms onjuiste/gemengde cijfers wanneer er tussen accounts geschakeld wordt of meerdere accounts tegelijk actief zijn. Vermoedelijke oorzaak: trades worden in `mt5_trades_store.json` niet consistent aan een account-ID gekoppeld, of het filter in `Trading-Journal-PnL.html` selecteert niet strikt genoeg op het actieve account bij het herberekenen van de statistieken. **Nog te fixen — prioriteit.**

## Roadmap / ideeën
- Screenshot-upload per trade (setup-foto bij journal entry)
- Losstaande sessie-indicator (Sydney/Tokyo/London/New York) voor context bij het loggen
- Excel/CSV-export van gefilterde resultaten

## Bijdragen
Dit is een privérepo, gedeeld met een beperkt aantal contributors. Werk in een feature branch en open een pull request naar `main` voor review.
