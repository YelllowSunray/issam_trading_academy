"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MemberPage } from "@/components/platform/MemberPage";
import { SignalCard } from "@/components/signals/SignalCard";
import {
  deleteGoal,
  fetchDashboard,
  saveGoal,
} from "@/lib/journal/api-client";
import { fmtEur } from "@/lib/journal/format";
import type { GoalItem } from "@/lib/goals/types";
import type { TradeSignal } from "@/lib/signals/types";

type Dash = {
  lastSignal: TradeSignal | null;
  academy: {
    completed: number;
    total: number;
    nextCourseId: string | null;
    nextCourseTitle: string | null;
  };
  community: {
    linked: boolean;
    telegramUsername: string | null;
    tier: "vip" | "normal";
    publicChannel: string;
  };
  pnl: {
    totalEur: number | null;
    tradeCount: number;
    lastDate: string | null;
  };
  goals: GoalItem[];
};

function DashboardInner() {
  const { profile, asUser } = useAuth();
  const readOnly = Boolean(asUser && asUser !== profile?.uid);
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }, []);

  useEffect(() => {
    load();
  }, [load, asUser]);

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">HUB</p>
      <h1 className="tj-title">Dashboard</h1>
      <p className="pl-sub">
        Laatste signaal, voortgang, community en P&amp;L — één startpunt.
      </p>
      {error && <div className="pl-empty">{error}</div>}

      <div className="dash-grid">
        <section className="tj-panel">
          <div className="ttl">Laatste signaal</div>
          {data?.lastSignal ? (
            <>
              <SignalCard signal={data.lastSignal} compact />
              <Link href="/signals" className="pl-reset-btn" style={{ marginTop: 10 }}>
                Alle signalen
              </Link>
            </>
          ) : (
            <p className="pl-sub2">Nog geen signalen. Issam plaatst ze in Admin.</p>
          )}
        </section>

        <section className="tj-panel">
          <div className="ttl">Academy</div>
          <p className="pl-value" style={{ margin: "8px 0" }}>
            {data ? `${data.academy.completed}/${data.academy.total}` : "—"} lessen
          </p>
          {data?.academy.nextCourseTitle ? (
            <p className="pl-sub2">Volgende: {data.academy.nextCourseTitle}</p>
          ) : (
            <p className="pl-sub2">Alle gepubliceerde lessen afgerond.</p>
          )}
          <div className="plat-chip-row" style={{ marginTop: 12 }}>
            <Link href="/learn" className="tb-addbtn" style={{ textDecoration: "none" }}>
              Open academy
            </Link>
            <Link href="/learn/certificates" className="pl-reset-btn">
              Certificates
            </Link>
          </div>
        </section>

        <section className="tj-panel">
          <div className="ttl">Community</div>
          <p className="pl-sub2">
            {data?.community.linked
              ? `Telegram @${data.community.telegramUsername || "gekoppeld"} · ${data.community.tier === "vip" ? "VIP-groep" : "normale groep"}`
              : "Koppel Telegram voor je persoonlijke groepsinvite."}
          </p>
          <div className="plat-chip-row" style={{ marginTop: 12 }}>
            <Link href="/community" className="tb-addbtn" style={{ textDecoration: "none" }}>
              Open community
            </Link>
            {data?.community.publicChannel ? (
              <a
                href={data.community.publicChannel}
                target="_blank"
                rel="noreferrer"
                className="pl-reset-btn"
              >
                Publieke channel
              </a>
            ) : null}
          </div>
        </section>

        <section className="tj-panel">
          <div className="ttl">P&amp;L snapshot</div>
          <p className="pl-value" style={{ margin: "8px 0" }}>
            {data?.pnl.totalEur != null ? fmtEur(data.pnl.totalEur) : "—"}
          </p>
          <p className="pl-sub2">
            {data?.pnl.tradeCount ?? 0} trades
            {data?.pnl.lastDate ? ` · laatst ${data.pnl.lastDate}` : ""}
          </p>
          <Link href="/journal#dashboard" className="pl-reset-btn" style={{ marginTop: 12 }}>
            Journal &amp; P&amp;L
          </Link>
        </section>
      </div>

      <section className="tj-panel" style={{ marginTop: 16 }}>
        <div className="ttl">Goals &amp; checkpoints</div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          Korte tracker. Geen aparte pagina.
        </p>
        {!readOnly ? (
          <form
            className="plat-inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!title.trim()) return;
              setBusy(true);
              try {
                await saveGoal({ title: title.trim() });
                setTitle("");
                load();
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              className="tj-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nieuw checkpoint…"
            />
            <button className="tb-addbtn" type="submit" disabled={busy}>
              Toevoegen
            </button>
          </form>
        ) : null}
        <ul className="goal-list">
          {(data?.goals || []).map((g) => (
            <li key={g.id}>
              <label>
                <input
                  type="checkbox"
                  checked={g.done}
                  disabled={readOnly}
                  onChange={async () => {
                    if (readOnly) return;
                    await saveGoal({ id: g.id, title: g.title, done: !g.done });
                    load();
                  }}
                />
                <span className={g.done ? "done" : ""}>{g.title}</span>
              </label>
              {!readOnly ? (
                <button
                  type="button"
                  className="pl-reset-btn"
                  onClick={async () => {
                    await deleteGoal(g.id);
                    load();
                  }}
                >
                  Weg
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {!data?.goals.length ? (
          <p className="pl-sub2">Nog geen checkpoints. Zet er één voor deze week.</p>
        ) : null}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <MemberPage>
      <DashboardInner />
    </MemberPage>
  );
}
