"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createManualTrade,
  deleteManualTrade,
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

export function JournalApp() {
  const { profile, asUser, setAsUser } = useAuth();
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
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

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

  const pollMt5 = useCallback(async (login: string | null) => {
    try {
      const list = await fetchAccounts();
      setAccounts(list);
      const wanted =
        login && list.some((a) => String(a.login) === String(login))
          ? login
          : list[0]?.login || null;
      if (wanted && wanted !== login) setSelectedLogin(wanted);
      const q = wanted;
      const [s, trades] = await Promise.all([
        fetchStatus(q),
        fetchMt5Trades(q),
      ]);
      setStatus(s);
      setMt5Trades(trades);
    } catch {
      setAccounts([]);
      setStatus({
        connected: false,
        account: null,
        trade_count: 0,
        last_sync: null,
        last_heartbeat: null,
        error: "niet bereikbaar",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBooting(true);
        setBootError(null);
        const settings = await fetchSettings();
        if (cancelled) return;
        setSelectedLogin(settings.selectedLogin);
        await refreshJournal();
        await pollMt5(settings.selectedLogin);
      } catch (err) {
        if (!cancelled) {
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
  }, [pollMt5, refreshJournal, asUser]);

  useEffect(() => {
    const id = setInterval(() => {
      void pollMt5(selectedLogin);
    }, 15000);
    return () => clearInterval(id);
  }, [pollMt5, selectedLogin, asUser]);

  const enriched = useMemo(
    () => enrichTrades(mergeTrades(manualTrades, mt5Trades, annotations)),
    [manualTrades, mt5Trades, annotations],
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
          setSelectedLogin(login);
          if (!readOnly) await saveSettings({ selectedLogin: login });
          await pollMt5(login);
        }}
        status={status}
        onAddTrade={() => setShowTradeModal(true)}
        isAdmin={profile?.role === "admin"}
        viewingAsLabel={readOnly ? asUser : null}
        onClearAsUser={() => setAsUser(null)}
        readOnly={readOnly}
      />

      <main className="journal-main">
        {bootError && (
          <div className="pl-empty" style={{ marginBottom: 16 }}>
            {bootError}
          </div>
        )}
        {readOnly && (
          <div className="pl-empty" style={{ marginBottom: 16 }}>
            Read-only coach view — je bekijkt de journal van een student.
          </div>
        )}
        {booting && !bootError ? (
          <div className="journal-loading">Journal laden…</div>
        ) : page === "journal" ? (
          <JournalView
            trades={enriched}
            readOnly={readOnly}
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
