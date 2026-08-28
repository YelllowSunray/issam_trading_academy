"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createManualTrade,
  createTradeDebrief,
  deleteManualTrade,
  fetchTradeDebrief,
  fetchAccounts,
  fetchAnnotations,
  fetchManualTrades,
  fetchMt5Trades,
  fetchSettings,
  fetchStatus,
  saveAnnotation,
  saveSettings,
  uploadImage,
} from "@/lib/journal/api-client";
import { AiCoach } from "./AiCoach";
import { enrichTrades, mergeTrades } from "@/lib/journal/compute";
import type {
  ManualTrade,
  Mt5AccountSummary,
  Mt5Status,
  Mt5Trade,
  TradeAnnotation,
} from "@/lib/journal/types";
import { AnnotateModal } from "./AnnotateModal";
import { JournalView } from "./JournalView";
import { Lightbox } from "./Lightbox";
import { PnLDashboard } from "./PnLDashboard";
import { Topbar } from "./Topbar";
import { TradeModal } from "./TradeModal";

type Page = "journal" | "dashboard";

/** Status/online poll — keep light. Full trade reload only on sync changes. */
const MT5_STATUS_POLL_MS = 45_000;
const MT5_ACCOUNTS_POLL_MS = 3 * 60_000;

export function JournalApp() {
  const { profile, asUser, coachTarget, setCoachTarget, loading: authLoading } =
    useAuth();
  const readOnly = Boolean(asUser && asUser !== profile?.uid);

  const [page, setPage] = useState<Page>("journal");
  const [manualTrades, setManualTrades] = useState<ManualTrade[]>([]);
  const [mt5Trades, setMt5Trades] = useState<Mt5Trade[]>([]);
  const [annotations, setAnnotations] = useState<
    Record<string, TradeAnnotation>
  >({});
  const [accounts, setAccounts] = useState<Mt5AccountSummary[]>([]);
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null);
  const [status, setStatus] = useState<Mt5Status>({
    connected: false,
    account: null,
    trade_count: 0,
    last_sync: null,
    last_heartbeat: null,
  });
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [annotateId, setAnnotateId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [debriefs, setDebriefs] = useState<Record<string, string>>({});
  const [debriefBusy, setDebriefBusy] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const lastSyncRef = useRef<string | null>(null);
  const lastTradeCountRef = useRef<number>(0);
  const lastAccountsFetchRef = useRef(0);
  const asUserRef = useRef(asUser);
  asUserRef.current = asUser;
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    setPage(hash === "dashboard" ? "dashboard" : "journal");
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      setPage(h === "dashboard" ? "dashboard" : "journal");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const changePage = (next: Page) => {
    setPage(next);
    window.location.hash = next === "dashboard" ? "dashboard" : "journal";
    window.scrollTo(0, 0);
  };

  const refreshJournal = useCallback(async () => {
    const [manual, anns] = await Promise.all([
      fetchManualTrades(),
      fetchAnnotations(),
    ]);
    setManualTrades(manual);
    setAnnotations(anns);
  }, []);

  const pollMt5 = useCallback(
    async (login: string | null, opts?: { full?: boolean }) => {
      const full = Boolean(opts?.full);
      const uid = asUserRef.current;
      try {
        const now = Date.now();
        const shouldRefreshAccounts =
          full || now - lastAccountsFetchRef.current >= MT5_ACCOUNTS_POLL_MS;

        let list = accountsRef.current;
        let wanted = login;
        if (shouldRefreshAccounts) {
          list = await fetchAccounts();
          if (asUserRef.current !== uid) return;
          lastAccountsFetchRef.current = now;
          setAccounts(list);
          const preferred =
            login && list.some((a) => String(a.login) === String(login))
              ? login
              : null;
          const richest = [...list].sort(
            (a, b) => (b.trade_count || 0) - (a.trade_count || 0),
          )[0];
          const preferredRow = list.find(
            (a) => String(a.login) === String(preferred),
          );
          wanted =
            preferredRow && (preferredRow.trade_count || 0) > 0
              ? preferred
              : richest?.login || preferred || list[0]?.login || null;
          if (wanted && wanted !== login) setSelectedLogin(wanted);
        }

        const s = await fetchStatus(wanted);
        if (asUserRef.current !== uid) return;
        setStatus(s);

        setAccounts((prev) =>
          prev.map((a) =>
            String(a.login) === String(wanted)
              ? {
                  ...a,
                  connected: s.connected,
                  balance: s.account?.balance ?? a.balance,
                  equity: s.account?.equity ?? a.equity,
                  currency: s.account?.currency ?? a.currency,
                  trade_count: s.trade_count,
                  last_heartbeat: s.last_heartbeat,
                }
              : a,
          ),
        );

        const syncChanged = s.last_sync !== lastSyncRef.current;
        const countChanged = s.trade_count !== lastTradeCountRef.current;
        if (full || syncChanged || countChanged) {
          const chunks = await Promise.all(
            (list.length ? list : [{ login: wanted }]).map((a) =>
              a.login ? fetchMt5Trades(a.login) : Promise.resolve([]),
            ),
          );
          if (asUserRef.current !== uid) return;
          setMt5Trades(chunks.flat());
          lastSyncRef.current = s.last_sync;
          lastTradeCountRef.current = s.trade_count;
        }
      } catch {
        if (asUserRef.current !== uid) return;
        if (full) setAccounts([]);
        setStatus({
          connected: false,
          account: null,
          trade_count: 0,
          last_sync: null,
          last_heartbeat: null,
          error: "niet bereikbaar",
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (authLoading || !profile) return;
    let cancelled = false;
    lastSyncRef.current = null;
    lastTradeCountRef.current = -1;
    lastAccountsFetchRef.current = 0;
    setDebriefs({});
    (async () => {
      try {
        setBooting(true);
        setBootError(null);
        const [settings, manual, anns, list] = await Promise.all([
          fetchSettings(),
          fetchManualTrades(),
          fetchAnnotations(),
          fetchAccounts(),
        ]);
        if (cancelled) return;
        setManualTrades(manual);
        setAnnotations(anns);
        setAccounts(list);
        lastAccountsFetchRef.current = Date.now();
        const richest = [...list].sort(
          (a, b) => (b.trade_count || 0) - (a.trade_count || 0),
        )[0];
        const preferred =
          settings.selectedLogin &&
          list.some((a) => String(a.login) === String(settings.selectedLogin))
            ? settings.selectedLogin
            : richest?.login || null;
        const login = readOnly ? null : preferred;
        setSelectedLogin(login);
        const logins = list.map((a) => a.login).filter(Boolean);
        const chunks = await Promise.all(
          (logins.length ? logins : [null]).map((item) => fetchMt5Trades(item)),
        );
        if (cancelled) return;
        setMt5Trades(chunks.flat());
        const s = await fetchStatus(preferred);
        if (cancelled) return;
        setStatus(s);
        lastSyncRef.current = s.last_sync;
        lastTradeCountRef.current = s.trade_count;
      } catch (err) {
        if (!cancelled) {
          setManualTrades([]);
          setMt5Trades([]);
          setBootError(
            err instanceof Error
              ? err.message
              : "Kon journal data niet laden. Check Firebase Admin credentials.",
          );
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, profile?.uid, asUser, readOnly]);

  useEffect(() => {
    const id = setInterval(() => {
      void pollMt5(selectedLogin);
    }, MT5_STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [pollMt5, selectedLogin, asUser]);

  const visibleMt5 = useMemo(() => {
    if (!selectedLogin) return mt5Trades;
    const scoped = mt5Trades.filter(
      (t) => t.login == null || String(t.login) === String(selectedLogin),
    );
    return scoped.length ? scoped : mt5Trades;
  }, [selectedLogin, mt5Trades]);

  const enriched = useMemo(
    () => enrichTrades(mergeTrades(manualTrades, visibleMt5, annotations)),
    [manualTrades, visibleMt5, annotations],
  );

  const annotateTrade = annotateId
    ? mt5Trades.find((t) => t.id === annotateId) || null
    : null;

  return (
    <div className="min-h-full flex flex-col">
      <Topbar
        page={page}
        onPageChange={changePage}
        accounts={accounts}
        selectedLogin={selectedLogin}
        onSelectLogin={async (login) => {
          const next = login || null;
          setSelectedLogin(next);
          if (!readOnly && next) await saveSettings({ selectedLogin: next });
          if (next) {
            lastSyncRef.current = null;
            lastTradeCountRef.current = -1;
            await pollMt5(next, { full: true });
          }
        }}
        status={status}
        onAddTrade={() => setShowTradeModal(true)}
        isAdmin={profile?.role === "admin"}
        coachName={readOnly ? coachTarget?.displayName : null}
        onClearAsUser={() => setCoachTarget(null)}
        readOnly={readOnly}
        embedded
      />

      <main className="journal-main">
        {bootError && (
          <div className="pl-empty" style={{ marginBottom: 16 }}>
            {bootError}
          </div>
        )}
        {readOnly && coachTarget && (
          <div className="coach-banner">
            <div>
              <div className="coach-banner-kicker">
                Coach-view · volledig journal
              </div>
              <div className="coach-banner-name">{coachTarget.displayName}</div>
              {coachTarget.email ? (
                <div className="coach-banner-email">{coachTarget.email}</div>
              ) : null}
              <div className="coach-banner-email">
                Alle trades, notes, tags en AI — alleen-lezen
              </div>
            </div>
            <div className="coach-banner-actions">
              <Link href="/admin" className="pl-reset-btn">
                Alle studenten
              </Link>
              <button
                type="button"
                className="tb-addbtn"
                style={{ fontSize: 12, padding: "8px 12px" }}
                onClick={() => setCoachTarget(null)}
              >
                Stop coach-view
              </button>
            </div>
          </div>
        )}
        {booting && !bootError ? (
          <div className="journal-loading">Home laden…</div>
        ) : page === "journal" ? (
          <>
            <AiCoach key={asUser || "self"} readOnly={readOnly} />
            <JournalView
              trades={enriched}
              readOnly={readOnly}
              debriefs={debriefs}
              debriefBusy={debriefBusy}
              onOpenTrade={async (id) => {
                if (debriefs[id] || debriefBusy === id) return;
                setDebriefBusy(id);
                try {
                  const rec = await fetchTradeDebrief(id);
                  if (rec.debrief?.body) {
                    setDebriefs((prev) => ({ ...prev, [id]: rec.debrief!.body }));
                  }
                } catch {
                  /* cache miss is fine */
                } finally {
                  setDebriefBusy(null);
                }
              }}
              onDebrief={
                readOnly
                  ? undefined
                  : async (id) => {
                      setDebriefBusy(id);
                      try {
                        const rec = await createTradeDebrief(id);
                        setDebriefs((prev) => ({ ...prev, [id]: rec.body }));
                      } catch (err) {
                        window.alert(
                          err instanceof Error ? err.message : "Debrief mislukt",
                        );
                      } finally {
                        setDebriefBusy(null);
                      }
                    }
              }
              onDelete={async (id) => {
                if (readOnly) return;
                await deleteManualTrade(id);
                await refreshJournal();
              }}
              onAnnotate={(id) => {
                if (readOnly) return;
                setAnnotateId(id);
              }}
              onLightbox={setLightbox}
            />
          </>
        ) : (
          <PnLDashboard trades={enriched} />
        )}
      </main>

      {showTradeModal && !readOnly && (
        <TradeModal
          onClose={() => setShowTradeModal(false)}
          onSave={async (trade) => {
            let imageUrl: string | null = null;
            if (trade.imageDataUrl) {
              const uploaded = await uploadImage(trade.imageDataUrl);
              imageUrl = uploaded.imageUrl;
            }
            await createManualTrade({
              date: trade.date,
              instrument: trade.instrument,
              direction: trade.direction,
              entry: trade.entry,
              sl: trade.sl,
              exit: trade.exit,
              riskEur: trade.riskEur,
              tags: trade.tags,
              notes: trade.notes,
              imageUrl,
            });
            setShowTradeModal(false);
            await refreshJournal();
          }}
        />
      )}

      {annotateTrade && !readOnly && (
        <AnnotateModal
          trade={annotateTrade}
          initial={
            annotations[annotateTrade.id] || {
              tags: [],
              notes: "",
              imageUrl: null,
            }
          }
          onClose={() => setAnnotateId(null)}
          onSave={async (ann) => {
            let imageUrl = ann.imageUrl || null;
            if (ann.imageDataUrl !== undefined) {
              if (ann.imageDataUrl) {
                const uploaded = await uploadImage(ann.imageDataUrl);
                imageUrl = uploaded.imageUrl;
              } else {
                imageUrl = null;
              }
            }
            await saveAnnotation(annotateTrade.id, {
              tags: ann.tags,
              notes: ann.notes,
              imageUrl,
            });
            setAnnotateId(null);
            await refreshJournal();
          }}
        />
      )}

      {lightbox && (
        <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
