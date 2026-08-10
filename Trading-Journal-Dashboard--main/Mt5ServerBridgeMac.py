"""
MT5 Bridge Server (v3 — multi-account) — ontvangt trades van JournalSyncEA
------------------------------------------------------------------------------
Draait lokaal naast MT5 (werkt op elk OS, want dit script praat niet
rechtstreeks met MT5 — dat doet de Expert Advisor JournalSyncEA.mq5 die IN
MT5 zelf draait en trades + heartbeats naar dit script POST't).

Nieuw in v3: ondersteunt meerdere MT5-accounts tegelijk. Elke trade en
heartbeat wordt getagged met het account-inlognummer, en apart bewaard.
De app kan via een dropdown wisselen tussen accounts.

Migratie: als je van v2 komt (1 account, geen "login" veld), wordt je
bestaande data automatisch verhuisd naar het juiste account zodra de
eerste heartbeat van dat account binnenkomt. Je hoeft niks handmatig te
verwijderen of te doen.

Vereisten (eenmalig, op je Mac):
    pip install flask flask-cors

Gebruik:
    python3 Mt5ServerBridgeMac.py
"""

import json
import os
import threading
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

PORT = 8765
HEARTBEAT_TIMEOUT_SECONDS = 90
STORE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mt5_trades_store.json")
LEGACY_BUCKET = "onbekend"

app = Flask(__name__)
CORS(app)

_lock = threading.Lock()
_accounts = {}  # login(str) -> {"info": {...}, "last_heartbeat": iso, "trades": {id: trade}, "last_trade_sync": iso}


def _empty_account():
    return {"info": None, "last_heartbeat": None, "trades": {}, "last_trade_sync": None}


def _load_store():
    global _accounts
    if not os.path.exists(STORE_PATH):
        return
    try:
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)
        if isinstance(raw, list):
            # oude (v2) structuur: platte lijst zonder account-scheiding
            acc = _empty_account()
            acc["trades"] = {t["id"]: t for t in raw if "id" in t}
            _accounts = {LEGACY_BUCKET: acc} if acc["trades"] else {}
        elif isinstance(raw, dict):
            _accounts = raw
            for acc in _accounts.values():
                acc.setdefault("info", None)
                acc.setdefault("last_heartbeat", None)
                acc.setdefault("trades", {})
                acc.setdefault("last_trade_sync", None)
    except Exception as e:
        print(f"Kon store niet laden ({e}), begin leeg.")
        _accounts = {}


def _save_store():
    try:
        with open(STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(_accounts, f, indent=2)
    except Exception as e:
        print(f"Kon store niet opslaan: {e}")


_load_store()


def _login_from(data):
    login = data.get("login")
    return str(login) if login is not None else LEGACY_BUCKET


def _migrate_legacy_if_needed(login):
    """Verhuist de oude ongetagde data naar het eerste echte account dat zich meldt."""
    if login != LEGACY_BUCKET and login not in _accounts and LEGACY_BUCKET in _accounts:
        _accounts[login] = _accounts.pop(LEGACY_BUCKET)


def _is_connected(acc):
    if not acc or not acc.get("last_heartbeat"):
        return False
    age = (datetime.now() - datetime.fromisoformat(acc["last_heartbeat"])).total_seconds()
    return age < HEARTBEAT_TIMEOUT_SECONDS


@app.route("/api/mt5-trade", methods=["POST"])
def receive_trade():
    data = request.get_json(force=True, silent=True)
    if not data or "id" not in data:
        return jsonify({"ok": False, "error": "ongeldige payload"}), 400
    login = _login_from(data)
    new_id = data["id"]
    with _lock:
        _migrate_legacy_if_needed(login)
        acc = _accounts.setdefault(login, _empty_account())

        # Dedupe over ALLE accounts heen -- maar ALLEEN als deze binnenkomende trade
        # zelf al correct getagd is (nieuw formaat "mt5-{login}-{posId}"). Is de
        # binnenkomende trade zelf nog het oude, ongetagde formaat (login onbekend),
        # dan NIET opschonen elders -- anders vernietig je per ongeluk al correct
        # gelabelde data zodra een oudere EA-versie dezelfde trade nogmaals stuurt.
        legacy_id = "mt5-" + new_id.rsplit("-", 1)[-1]
        is_new_format = (new_id != legacy_id)
        if is_new_format:
            for other_login, other_acc in _accounts.items():
                if legacy_id in other_acc["trades"] and not (other_login == login and legacy_id == new_id):
                    other_acc["trades"].pop(legacy_id, None)

        acc["trades"][new_id] = data
        acc["last_trade_sync"] = datetime.now().isoformat()
        _save_store()
    return jsonify({"ok": True})


@app.route("/api/heartbeat", methods=["POST"])
def receive_heartbeat():
    data = request.get_json(force=True, silent=True) or {}
    login = _login_from(data)
    with _lock:
        _migrate_legacy_if_needed(login)
        acc = _accounts.setdefault(login, _empty_account())
        acc["info"] = data
        acc["last_heartbeat"] = datetime.now().isoformat()
        _save_store()
    return jsonify({"ok": True})


@app.route("/api/accounts")
def api_accounts():
    with _lock:
        out = []
        for login, acc in _accounts.items():
            info = acc.get("info") or {}
            out.append({
                "login": login,
                "balance": info.get("balance"),
                "equity": info.get("equity"),
                "currency": info.get("currency"),
                "connected": _is_connected(acc),
                "trade_count": len(acc.get("trades", {})),
                "last_heartbeat": acc.get("last_heartbeat"),
            })
        out.sort(key=lambda a: a["login"])
        return jsonify(out)


@app.route("/api/trades")
def api_trades():
    login = request.args.get("login")
    with _lock:
        if not login:
            if not _accounts:
                return jsonify([])
            login = sorted(_accounts.keys())[0]
        acc = _accounts.get(login)
        if not acc:
            return jsonify([])
        out = sorted(acc["trades"].values(), key=lambda t: t.get("date", ""))
        return jsonify(out)


@app.route("/api/status")
def api_status():
    login = request.args.get("login")
    with _lock:
        if not login:
            if not _accounts:
                return jsonify({"connected": False, "account": None, "trade_count": 0, "last_sync": None, "last_heartbeat": None})
            login = sorted(_accounts.keys())[0]
        acc = _accounts.get(login) or _empty_account()
        return jsonify({
            "connected": _is_connected(acc),
            "account": acc.get("info"),
            "trade_count": len(acc.get("trades", {})),
            "last_sync": acc.get("last_trade_sync"),
            "last_heartbeat": acc.get("last_heartbeat"),
        })


if __name__ == "__main__":
    print("=" * 62)
    print(f"MT5 bridge (ontvanger) draait op http://127.0.0.1:{PORT}")
    print("Wacht op trades/heartbeats vanuit JournalSyncEA in MT5...")
    print(f"Trades worden bewaard in: {STORE_PATH}")
    print("=" * 62)
    app.run(host="127.0.0.1", port=PORT)
