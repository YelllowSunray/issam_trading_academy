"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  addAdminCloudAccount,
  deleteAdminCourse,
  fetchAdminAiBrief,
  fetchAdminCloudAccounts,
  fetchAdminOverview,
  fetchBillingStatus,
  deleteAdminSignal,
  fetchSignals,
  saveAdminCourse,
  saveAdminSignal,
  savePlatformSettings,
  seedStarterCourse,
  setAdminMembership,
  setAdminUserDisabled,
  setBillingExceeded,
  syncAdminCloudAccounts,
  unlinkAdminCloudAccount,
  type BillingLockInfo,
  type CloudAccountRow,
  type CloudAccountsPayload,
} from "@/lib/journal/api-client";
import type { MembershipStatus } from "@/lib/auth/types";
import type { TradeDirection } from "@/lib/journal/types";
import type { TradeSignal } from "@/lib/signals/types";
import type {
  AdminOverview,
  Course,
  MemberRow,
  PlatformSettings,
} from "@/lib/platform/types";
import { VIP_PLANS } from "@/lib/platform/plans";
import { hardReplace } from "@/lib/navigation";

type Tab =
  | "overzicht"
  | "coach"
  | "leden"
  | "cloud"
  | "cursussen"
  | "signalen"
  | "community"
  | "systeem";

function rel(iso: string | null | undefined) {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "zojuist";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} u`;
  return `${Math.floor(hours / 24)} d`;
}

export function AdminApp() {
  const { profile, setCoachTarget } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overzicht");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [billing, setBilling] = useState<BillingLockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | MembershipStatus>("all");
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [editing, setEditing] = useState<Course | null>(null);
  const [cloud, setCloud] = useState<CloudAccountsPayload | null>(null);
  const [prefillEmail, setPrefillEmail] = useState("");

  useEffect(() => {
    if (profile && profile.role !== "admin") {
      hardReplace("/dashboard");
    }
  }, [profile]);

  function reload() {
    return Promise.all([
      fetchAdminOverview(),
      fetchBillingStatus(),
      fetchAdminCloudAccounts().catch(() => null),
    ])
      .then(([data, b, c]) => {
        setOverview(data.overview);
        setMembers(data.members);
        setCourses(data.courses);
        setSettings(data.settings);
        setBilling(b);
        if (c) setCloud(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }

  useEffect(() => {
    if (profile?.role === "admin") void reload();
  }, [profile?.role]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return members.filter((m) => {
      if (filter === "all") {
        /* keep */
      } else if (filter === "none") {
        if (m.role === "admin" || m.membership !== "none") return false;
      } else if (m.role === "admin" || m.membership !== filter) {
        return false;
      }
      if (!s) return true;
      return (
        m.email.toLowerCase().includes(s) ||
        m.displayName.toLowerCase().includes(s)
      );
    });
  }, [members, q, filter]);

  if (profile && profile.role !== "admin") return null;

  const ownerEmail = (
    billing?.ownerEmail || billing?.contactEmail || ""
  )
    .trim()
    .toLowerCase();
  const canManageBilling =
    Boolean(profile?.email) &&
    profile!.email.trim().toLowerCase() === ownerEmail;

  function openCoach(m: MemberRow, href = "/dashboard") {
    if (m.uid === profile?.uid) {
      setCoachTarget(null);
    } else {
      setCoachTarget({
        uid: m.uid,
        displayName: m.displayName,
        email: m.email,
      });
    }
    const [path, hash] = href.split("#");
    router.push(path);
    if (hash) {
      queueMicrotask(() => {
        window.location.hash = hash;
      });
    }
  }

  async function changeMembership(uid: string, membership: MembershipStatus) {
    setBusyUid(uid);
    try {
      await setAdminMembership(uid, membership);
      setMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, membership } : m)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Membership bijwerken mislukt");
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">ADMIN</p>
      <h1 className="tj-title">Platform-overzicht</h1>
      <p className="pl-sub">
        <strong>VIP</strong> via Stripe, <strong>1:1</strong> handmatig.
        Coach-view opent dashboard, journal, backtest, academy, certificates
        en Telegram van de student — alleen-lezen.
        {profile?.email ? ` Ingelogd als ${profile.email}.` : ""}
      </p>

      <div className="tb-tabs" style={{ marginBottom: 22 }}>
        {(
          [
            ["overzicht", "Overzicht"],
            ["coach", "Coach-view"],
            ["leden", "Leden"],
            ["cloud", "Cloud MT5"],
            ["cursussen", "Cursussen"],
            ["signalen", "Signalen"],
            ["community", "Community"],
            ["systeem", "VIP-prijzen"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tb-tab${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="pl-empty" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      {tab === "overzicht" && overview && (
        <>
          <div className="pl-two-col" style={{ marginBottom: 16 }}>
            <div className="tj-panel">
              <div className="ttl">1:1 coaching</div>
              <p className="pl-sub2">
                Coaching-klanten. Platform inbegrepen, geen Stripe.
                Issam factureert zelf.
              </p>
              <div className="pl-value" style={{ marginTop: 10 }}>
                {overview.members.coachingFree}
              </div>
              <div className="pl-sub2">
                {settings?.coachingPriceNote || "Prijs buiten de app"}
              </div>
            </div>
            <div className="tj-panel">
              <div className="ttl">VIP · geen 1:1</div>
              <p className="pl-sub2">
                Stripe-pakketten (€100 / €250 / €500 / €1000). Signals, academy
                en VIP-Telegram. Geen 1:1.
              </p>
              <div className="pl-value" style={{ marginTop: 10 }}>
                {overview.members.subscriber}
              </div>
              <div className="pl-sub2">
                {settings?.subscriberPriceLabel || "VIP vanaf €100 / maand"}
                {" · "}
                Stripe {overview.stripe.configured ? "klaar" : "wacht op Price IDs"}
              </div>
            </div>
          </div>
          <div className="pl-kpi-grid">
            <Kpi label="Leden" value={overview.members.total} />
            <Kpi label="Wacht op toegang" value={overview.members.none} />
            <Kpi label="Verlopen" value={overview.members.expired} />
            <Kpi label="Journal 24u" value={overview.members.journalActiveToday} />
            <Kpi label="Online 24u" value={overview.members.seenRecently} />
            <Kpi
              label="Cursussen"
              value={`${overview.courses.published}/${overview.courses.total}`}
            />
            <Kpi
              label="Telegram gekoppeld"
              value={overview.community.telegramLinked}
            />
            <Kpi
              label="Signals open"
              value={`${overview.signals.open}/${overview.signals.total}`}
            />
            <Kpi
              label="Goals"
              value={`${overview.goals.total} · ${overview.goals.students} leden`}
            />
            <Kpi
              label="Backtests"
              value={`${overview.backtests.total} · ${overview.backtests.students} leden`}
            />
            <Kpi label="Certificates" value={overview.certificates.awarded} />
            <Kpi label="Disabled" value={overview.members.disabled} />
          </div>
        </>
      )}

      {tab === "coach" && (
        <CoachRoster members={members} onOpen={openCoach} />
      )}

      {tab === "leden" && (
        <section className="tj-panel">
          <p className="pl-sub2" style={{ marginBottom: 12 }}>
            <strong>VIP</strong> = Stripe-pakket, geen 1:1.
            <strong> 1:1</strong> = coaching-klant (jij zet dat aan). Coach-view
            opent hun hele platform. Admins staan apart.
          </p>
          <div className="plat-chip-row">
            {(
              [
                ["all", "Alle"],
                ["none", "Geen toegang"],
                ["subscriber", "VIP"],
                ["coaching_free", "1:1"],
                ["expired", "Verlopen"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`plat-chip${filter === id ? " active" : ""}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            className="tj-input"
            placeholder="Zoek op naam of e-mail…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ marginBottom: 14, maxWidth: 360 }}
          />
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Lid</th>
                  <th>Toegang</th>
                  <th>Journal</th>
                  <th>Academy</th>
                  <th>TG</th>
                  <th>Goals</th>
                  <th>BT</th>
                  <th>Certs</th>
                  <th>Seen</th>
                  <th style={{ textAlign: "right" }}>Acties</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.uid}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {m.displayName}
                        {m.role === "admin" ? (
                          <span className="status-chip" style={{ marginLeft: 8 }}>
                            admin
                          </span>
                        ) : null}
                        {m.disabled ? (
                          <span className="status-chip off" style={{ marginLeft: 8 }}>
                            disabled
                          </span>
                        ) : null}
                      </div>
                      <div className="pl-sub2">{m.email}</div>
                    </td>
                    <td>
                      <AccessBadge member={m} />
                    </td>
                    <td>{rel(m.lastJournalActivityAt)}</td>
                    <td>
                      {m.lessonsCompleted}/{m.lessonsTotal}
                    </td>
                    <td>
                      {m.telegramLinked
                        ? `@${m.telegramUsername || "gekoppeld"}`
                        : "—"}
                    </td>
                    <td>{m.goalsCount || "—"}</td>
                    <td>{m.backtestsCount || "—"}</td>
                    <td>{m.certificatesCount || "—"}</td>
                    <td>{rel(m.lastSeenAt)}</td>
                    <td>
                      <div className="admin-table-actions">
                        {m.role !== "admin" &&
                          m.membership !== "coaching_free" && (
                          <button
                            type="button"
                            className="tb-addbtn"
                            style={{ fontSize: 11.5, padding: "8px 12px" }}
                            disabled={busyUid === m.uid}
                            onClick={() =>
                              void changeMembership(m.uid, "coaching_free")
                            }
                          >
                            {m.membership === "subscriber"
                              ? "Upgrade naar 1:1"
                              : "Zet op 1:1"}
                          </button>
                        )}
                        {m.role !== "admin" &&
                          m.membership === "coaching_free" && (
                          <button
                            type="button"
                            className="pl-reset-btn"
                            disabled={busyUid === m.uid}
                            onClick={() => void changeMembership(m.uid, "none")}
                          >
                            Stop 1:1
                          </button>
                        )}
                        {m.role !== "admin" && m.membership === "subscriber" && (
                          <button
                            type="button"
                            className="pl-reset-btn"
                            disabled={busyUid === m.uid}
                            onClick={() =>
                              void changeMembership(m.uid, "expired")
                            }
                          >
                            Stop abonnement
                          </button>
                        )}
                        <button
                          type="button"
                          className="tb-addbtn"
                          style={{ fontSize: 11.5, padding: "8px 12px" }}
                          onClick={() => {
                            setPrefillEmail(m.email);
                            setTab("cloud");
                          }}
                        >
                          Cloud
                        </button>
                        <button
                          type="button"
                          className="tb-addbtn"
                          style={{ fontSize: 11.5, padding: "8px 12px" }}
                          onClick={() => openCoach(m, "/dashboard")}
                        >
                          Coach-view
                        </button>
                        <button
                          type="button"
                          className="tb-addbtn"
                          style={{ fontSize: 11.5, padding: "8px 12px" }}
                          disabled={busyUid === m.uid}
                          onClick={async () => {
                            setBusyUid(m.uid);
                            try {
                              const rec = await fetchAdminAiBrief(m.uid);
                              window.alert(rec.body);
                            } catch (err) {
                              window.alert(
                                err instanceof Error
                                  ? err.message
                                  : "AI brief mislukt",
                              );
                            } finally {
                              setBusyUid(null);
                            }
                          }}
                        >
                          AI brief
                        </button>
                        <button
                          type="button"
                          className="pl-reset-btn"
                          disabled={busyUid === m.uid || m.uid === profile?.uid}
                          onClick={async () => {
                            setBusyUid(m.uid);
                            try {
                              await setAdminUserDisabled(m.uid, !m.disabled);
                              setMembers((prev) =>
                                prev.map((x) =>
                                  x.uid === m.uid ? { ...x, disabled: !x.disabled } : x,
                                ),
                              );
                            } finally {
                              setBusyUid(null);
                            }
                          }}
                        >
                          {m.disabled ? "Activeren" : "Disable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="tj-empty">Geen leden in deze filter.</div>
            )}
          </div>
        </section>
      )}

      {tab === "cloud" && (
        <CloudTab
          cloud={cloud}
          members={members}
          prefillEmail={prefillEmail}
          onPrefillUsed={() => setPrefillEmail("")}
          onReload={async () => {
            const next = await fetchAdminCloudAccounts();
            setCloud(next);
          }}
          onError={setError}
        />
      )}

      {tab === "cursussen" && (
        <CoursesTab
          courses={courses}
          editing={editing}
          setEditing={setEditing}
          onChange={async () => {
            await reload();
          }}
        />
      )}

      {tab === "signalen" && <SignalsTab />}

      {tab === "community" && settings && (
        <CommunityTab
          settings={settings}
          onSave={async (patch) => {
            const next = await savePlatformSettings(patch);
            setSettings(next);
          }}
        />
      )}

      {tab === "systeem" && settings && (
        <>
          <PricingTab
            settings={settings}
            stripeReady={Boolean(overview?.stripe.configured)}
            onSave={async (patch) => {
              const next = await savePlatformSettings(patch);
              setSettings(next);
            }}
          />
          <section className="tj-panel">
            <div className="ttl">Firebase-budget</div>
            <p className="pl-sub2" style={{ marginBottom: 12 }}>
              Infra-kill-switch, niet student-facturatie.
              {canManageBilling
                ? ` Alleen ${ownerEmail} kan locken.`
                : " Alleen de owner kan locken."}
            </p>
            <div className="status-chip" style={{ marginBottom: 12 }}>
              {billing?.exceeded ? "Geblokkeerd" : "Actief"} · €
              {billing?.usage?.estimatedCostEur.toFixed(2) ?? "0.00"} / €
              {billing?.budgetEur ?? 10}
            </div>
            {canManageBilling && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="pl-reset-btn"
                  onClick={() =>
                    void setBillingExceeded(true, "manual_lock").then(setBilling)
                  }
                >
                  App blokkeren
                </button>
                <button
                  type="button"
                  className="pl-reset-btn"
                  onClick={() =>
                    void setBillingExceeded(false, "manual_unlock").then(setBilling)
                  }
                >
                  Ontgrendelen
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function AccessBadge({ member }: { member: MemberRow }) {
  if (member.role === "admin") {
    return (
      <div className="access-cell">
        <span className="status-chip on">Admin</span>
        <div className="pl-sub2">volledige toegang</div>
      </div>
    );
  }
  if (member.membership === "subscriber") {
    return (
      <div className="access-cell">
        <span className="status-chip on">VIP</span>
        <div className="pl-sub2">Stripe · geen 1:1</div>
      </div>
    );
  }
  if (member.membership === "coaching_free") {
    return (
      <div className="access-cell">
        <span className="status-chip on">1:1 coaching</span>
        <div className="pl-sub2">niet via Stripe</div>
      </div>
    );
  }
  if (member.membership === "expired") {
    return (
      <div className="access-cell">
        <span className="status-chip off">Verlopen</span>
        <div className="pl-sub2">was geabonneerd</div>
      </div>
    );
  }
  return (
    <div className="access-cell">
      <span className="status-chip">Geen toegang</span>
      <div className="pl-sub2">wacht op 1:1 of Stripe</div>
    </div>
  );
}

function CoachRoster({
  members,
  onOpen,
}: {
  members: MemberRow[];
  onOpen: (m: MemberRow, href: string) => void;
}) {
  const rows = members
    .filter((m) => m.role !== "admin")
    .slice()
    .sort((a, b) => {
      const aT = a.lastJournalActivityAt || "";
      const bT = b.lastJournalActivityAt || "";
      if (aT !== bT) return bT.localeCompare(aT);
      return a.displayName.localeCompare(b.displayName, "nl");
    });

  return (
    <section className="tj-panel">
      <div className="ttl">Coach-view</div>
      <p className="pl-sub2" style={{ marginBottom: 14 }}>
        Open het platform van de student: dashboard (P/L + goals), journal,
        backtest, signals, academy, certificates en Telegram. Alles
        alleen-lezen.
      </p>
      <div className="coach-roster">
        {rows.map((m) => (
          <article key={m.uid} className="coach-roster-card">
            <div>
              <div style={{ fontWeight: 600 }}>{m.displayName}</div>
              <div className="pl-sub2">{m.email}</div>
              <div style={{ marginTop: 8 }}>
                <AccessBadge member={m} />
              </div>
              <div className="pl-sub2" style={{ marginTop: 8 }}>
                Journal {rel(m.lastJournalActivityAt)} · academy{" "}
                {m.lessonsCompleted}/{m.lessonsTotal} · TG{" "}
                {m.telegramLinked ? `@${m.telegramUsername || "ok"}` : "—"} ·{" "}
                {m.goalsCount} goals · {m.backtestsCount} backtests ·{" "}
                {m.certificatesCount} certs
              </div>
            </div>
            <div className="coach-banner-nav">
              {(
                [
                  ["/dashboard", "Dashboard"],
                  ["/journal", "Journal"],
                  ["/journal#backtest", "Backtest"],
                  ["/signals", "Signals"],
                  ["/learn", "Academy"],
                  ["/learn/certificates", "Certs"],
                  ["/community", "Telegram"],
                ] as const
              ).map(([href, label]) => (
                <button
                  key={href}
                  type="button"
                  className="plat-chip"
                  onClick={() => onOpen(m, href)}
                >
                  {label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && <div className="tj-empty">Nog geen leden.</div>}
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="pl-kpi">
      <div className="pl-label">{label}</div>
      <div className="pl-value">{value}</div>
    </div>
  );
}

function PricingTab({
  settings,
  stripeReady,
  onSave,
}: {
  settings: PlatformSettings;
  stripeReady: boolean;
  onSave: (patch: Partial<PlatformSettings>) => Promise<void>;
}) {
  const [subscriberPriceLabel, setSubscriberPriceLabel] = useState(
    settings.subscriberPriceLabel,
  );
  const [coachingPriceNote, setCoachingPriceNote] = useState(
    settings.coachingPriceNote,
  );
  const [info, setInfo] = useState<string | null>(null);

  return (
    <section className="tj-panel">
      <div className="ttl">VIP-pakketten + 1:1</div>
      <p className="pl-sub2" style={{ marginBottom: 16 }}>
        Weergave-teksten. Stripe-leden kiezen een van de vier pakketten.
        1:1 factureert Issam zelf. Price IDs:{" "}
        <code>STRIPE_PRICE_MONTHLY</code> (of <code>STRIPE_PRICE_ID</code>),{" "}
        <code>STRIPE_PRICE_QUARTERLY</code>,{" "}
        <code>STRIPE_PRICE_SEMIANNUAL</code>, <code>STRIPE_PRICE_YEARLY</code>.
      </p>
      <div className="pl-kpi-grid" style={{ marginBottom: 16 }}>
        {VIP_PLANS.map((p) => (
          <Kpi
            key={p.id}
            label={p.label}
            value={`${p.priceLabel}${p.cadence}`}
          />
        ))}
      </div>
      <div className="tj-field">
        <div className="lbl">1:1 coaching (buiten Stripe)</div>
        <textarea
          className="tj-input"
          rows={2}
          value={coachingPriceNote}
          onChange={(e) => setCoachingPriceNote(e.target.value)}
        />
        <div className="hint" style={{ marginTop: 6 }}>
          Bijv. “€800 / maand, factuur via Issam. Platform is inbegrepen.”
        </div>
      </div>
      <div className="tj-field">
        <div className="lbl">Platform-abonnement (Stripe)</div>
        <input
          className="tj-input"
          value={subscriberPriceLabel}
          onChange={(e) => setSubscriberPriceLabel(e.target.value)}
          placeholder="VIP vanaf €100 / maand"
        />
        <div className="hint" style={{ marginTop: 6 }}>
          Extra regel op de paywall naast de vier pakketten. Stripe:{" "}
          {stripeReady
            ? "minstens één Price ID staat in env — checkout kan."
            : "nog geen STRIPE_PRICE_* IDs. Maak vier recurring prices en plak ze in env."}
        </div>
      </div>
      {info && <div className="pl-empty">{info}</div>}
      <button
        type="button"
        className="tb-addbtn"
        onClick={async () => {
          await onSave({ subscriberPriceLabel, coachingPriceNote });
          setInfo("Prijsteksten opgeslagen.");
        }}
      >
        Opslaan
      </button>
      <p className="pl-sub2" style={{ marginTop: 16 }}>
        Webhook: <code>/api/stripe/webhook</code> · env:{" "}
        <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRICE_MONTHLY</code> (of{" "}
        <code>STRIPE_PRICE_ID</code>), <code>STRIPE_PRICE_QUARTERLY</code>,{" "}
        <code>STRIPE_PRICE_SEMIANNUAL</code>, <code>STRIPE_PRICE_YEARLY</code>,{" "}
        <code>STRIPE_WEBHOOK_SECRET</code>
      </p>
    </section>
  );
}

function CommunityTab({
  settings,
  onSave,
}: {
  settings: PlatformSettings;
  onSave: (patch: Partial<PlatformSettings>) => Promise<void>;
}) {
  const [url, setUrl] = useState(settings.telegramInviteUrl);
  const [label, setLabel] = useState(settings.telegramLabel);
  const [note, setNote] = useState(settings.communityNote);
  const [vipChat, setVipChat] = useState(settings.telegramVipChatId || "");
  const [normalChat, setNormalChat] = useState(settings.telegramNormalChatId || "");
  const [info, setInfo] = useState<string | null>(null);

  return (
    <section className="tj-panel">
      <div className="ttl">Telegram-groepen</div>
      <p className="pl-sub2" style={{ marginBottom: 14 }}>
        Bot moet admin zijn in beide groepen. Env:{" "}
        <code>TELEGRAM_BOT_TOKEN</code>,{" "}
        <code>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>. Kick bij expiry is geen
        MVP. Fallback-URL alleen als de bot geen link kan maken.
      </p>
      <div className="tj-field">
        <div className="lbl">Label</div>
        <input className="tj-input" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="tj-field">
        <div className="lbl">VIP chat ID</div>
        <input
          className="tj-input"
          value={vipChat}
          onChange={(e) => setVipChat(e.target.value)}
          placeholder="-100…"
        />
      </div>
      <div className="tj-field">
        <div className="lbl">Normale chat ID</div>
        <input
          className="tj-input"
          value={normalChat}
          onChange={(e) => setNormalChat(e.target.value)}
          placeholder="-100…"
        />
      </div>
      <div className="tj-field">
        <div className="lbl">Fallback invite URL</div>
        <input
          className="tj-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://t.me/+"
        />
      </div>
      <div className="tj-field">
        <div className="lbl">Tekst voor leden</div>
        <textarea className="tj-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {info && <div className="pl-empty">{info}</div>}
      <button
        type="button"
        className="tb-addbtn"
        onClick={async () => {
          await onSave({
            telegramInviteUrl: url,
            telegramLabel: label,
            communityNote: note,
            telegramVipChatId: vipChat,
            telegramNormalChatId: normalChat,
          });
          setInfo("Opgeslagen.");
        }}
      >
        Opslaan
      </button>
    </section>
  );
}

function SignalsTab() {
  const [rows, setRows] = useState<TradeSignal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    instrument: "XAUUSD",
    direction: "Long" as TradeDirection,
    entry: "",
    sl: "",
    tp1: "",
    tp2: "",
    thesis: "",
    status: "open" as TradeSignal["status"],
    id: "" as string,
  });

  function load() {
    fetchSignals()
      .then((d) => setRows(d.signals))
      .catch((e) => setError(e instanceof Error ? e.message : "Laden mislukt"));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="tj-panel">
      <div className="ttl">Signals</div>
      <p className="pl-sub2" style={{ marginBottom: 14 }}>
        Geen copy-trading, geen MT5-executie. Elk signaal toont een verplichte
        disclaimer.
      </p>
      {error && <div className="pl-empty">{error}</div>}
      <div className="tj-grid3">
        <div className="tj-field">
          <div className="lbl">Instrument</div>
          <input
            className="tj-input"
            value={form.instrument}
            onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
          />
        </div>
        <div className="tj-field">
          <div className="lbl">Richting</div>
          <select
            className="tj-input"
            value={form.direction}
            onChange={(e) =>
              setForm((f) => ({ ...f, direction: e.target.value as TradeDirection }))
            }
          >
            <option>Long</option>
            <option>Short</option>
          </select>
        </div>
        <div className="tj-field">
          <div className="lbl">Status</div>
          <select
            className="tj-input"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as TradeSignal["status"],
              }))
            }
          >
            <option value="open">open</option>
            <option value="closed">closed</option>
          </select>
        </div>
      </div>
      <div className="tj-grid3">
        <div className="tj-field">
          <div className="lbl">Entry</div>
          <input
            className="tj-input"
            value={form.entry}
            onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))}
          />
        </div>
        <div className="tj-field">
          <div className="lbl">SL</div>
          <input
            className="tj-input"
            value={form.sl}
            onChange={(e) => setForm((f) => ({ ...f, sl: e.target.value }))}
          />
        </div>
        <div className="tj-field">
          <div className="lbl">TP1 / TP2</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="tj-input"
              value={form.tp1}
              onChange={(e) => setForm((f) => ({ ...f, tp1: e.target.value }))}
              placeholder="TP1"
            />
            <input
              className="tj-input"
              value={form.tp2}
              onChange={(e) => setForm((f) => ({ ...f, tp2: e.target.value }))}
              placeholder="TP2"
            />
          </div>
        </div>
      </div>
      <div className="tj-field">
        <div className="lbl">Rationale</div>
        <textarea
          className="tj-input"
          rows={3}
          value={form.thesis}
          onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
        />
      </div>
      <button
        type="button"
        className="tb-addbtn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await saveAdminSignal({
              id: form.id || undefined,
              instrument: form.instrument,
              direction: form.direction,
              entry: form.entry,
              sl: form.sl,
              tps: [form.tp1, form.tp2].filter(Boolean),
              thesis: form.thesis,
              status: form.status,
            });
            setForm((f) => ({
              ...f,
              id: "",
              entry: "",
              sl: "",
              tp1: "",
              tp2: "",
              thesis: "",
            }));
            load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Opslaan mislukt");
          } finally {
            setBusy(false);
          }
        }}
      >
        {form.id ? "Signaal bijwerken" : "Signaal plaatsen"}
      </button>
      <div style={{ marginTop: 16 }}>
        {rows.map((s) => (
          <div key={s.id} className="bt-row">
            <div>
              <strong>
                {s.instrument} {s.direction} · {s.status}
              </strong>
              <p>
                {s.entry} → SL {s.sl}
                {s.tps.length ? ` · TP ${s.tps.join(" / ")}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="pl-reset-btn"
                onClick={() =>
                  setForm({
                    id: s.id,
                    instrument: s.instrument,
                    direction: s.direction,
                    entry: s.entry,
                    sl: s.sl,
                    tp1: s.tps[0] || "",
                    tp2: s.tps[1] || "",
                    thesis: s.thesis,
                    status: s.status,
                  })
                }
              >
                Bewerk
              </button>
              <button
                type="button"
                className="pl-reset-btn"
                onClick={async () => {
                  await deleteAdminSignal(s.id);
                  load();
                }}
              >
                Weg
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CloudTab({
  cloud,
  members,
  prefillEmail,
  onPrefillUsed,
  onReload,
  onError,
}: {
  cloud: CloudAccountsPayload | null;
  members: MemberRow[];
  prefillEmail: string;
  onPrefillUsed: () => void;
  onReload: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [mode, setMode] = useState<"register" | "map">("register");
  const [email, setEmail] = useState(prefillEmail);
  const [login, setLogin] = useState("");
  const [server, setServer] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!prefillEmail) return;
    setEmail(prefillEmail);
    onPrefillUsed();
  }, [prefillEmail, onPrefillUsed]);

  async function run(task: () => Promise<string>) {
    setBusy(true);
    setInfo(null);
    onError(null);
    try {
      setInfo(await task());
      await onReload();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Cloud-actie mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="tj-panel" style={{ marginBottom: 16 }}>
        <div className="ttl">API2Trade cloud-sync</div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          API2Trade is één academy-account (vendor-login). Trades gaan naar
          het academy-profiel van de student, niet naar het API2Trade-e-mailadres.
          Issam staat al gekoppeld. Extra studenten vereisen extra API2Trade-seats.
        </p>
        {!cloud?.configured && (
          <div className="pl-empty" style={{ marginBottom: 12 }}>
            API2TRADE_API_KEY ontbreekt in de server-env.
          </div>
        )}
        {cloud?.vendorError && (
          <div className="pl-empty" style={{ marginBottom: 12 }}>
            Vendor: {cloud.vendorError}
          </div>
        )}
        <div className="pl-sub2" style={{ marginBottom: 12 }}>
          Vendor-login (API2Trade):{" "}
          {cloud?.seed.vendorOwnerEmail || "cryptozayn@gmail.com"}
          <br />
          Eerste journal-eigenaar: {cloud?.seed.email || "ia.lieveldd@gmail.com"}{" "}
          / login {cloud?.seed.login}
          <br />
          Vendor-accounts: {cloud?.vendor.length ?? 0}
        </div>
        <button
          type="button"
          className="tb-addbtn"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const res = await syncAdminCloudAccounts();
              const ok = res.results.filter((r) => r.ok).length;
              return `Sync klaar: ${ok}/${res.results.length} ok.`;
            })
          }
        >
          {busy ? "Bezig…" : "Sync alle accounts"}
        </button>
      </section>

      <section className="tj-panel" style={{ marginBottom: 16 }}>
        <div className="ttl">Student koppelen</div>
        <div className="plat-chip-row" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`plat-chip${mode === "register" ? " active" : ""}`}
            onClick={() => setMode("register")}
          >
            Nieuw via API
          </button>
          <button
            type="button"
            className={`plat-chip${mode === "map" ? " active" : ""}`}
            onClick={() => setMode("map")}
          >
            Bestaande UUID
          </button>
        </div>
        <div className="tj-field">
          <div className="lbl">Student</div>
          <input
            className="tj-input"
            list="cloud-member-emails"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@email.com"
          />
          <datalist id="cloud-member-emails">
            {members.map((m) => (
              <option key={m.uid} value={m.email}>
                {m.displayName}
              </option>
            ))}
          </datalist>
        </div>
        <div className="tj-field">
          <div className="lbl">MT5-login</div>
          <input
            className="tj-input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="24615704"
          />
        </div>
        {mode === "register" ? (
          <>
            <div className="tj-field">
              <div className="lbl">Broker-server</div>
              <input
                className="tj-input"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="exacte servernaam, bijv. ICMarketsSC-MT5"
              />
            </div>
            <div className="tj-field">
              <div className="lbl">Wachtwoord</div>
              <input
                className="tj-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="investor als de broker het toelaat"
                autoComplete="new-password"
              />
            </div>
            <div className="tj-field">
              <div className="lbl">Naam (optioneel)</div>
              <input
                className="tj-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student · main"
              />
            </div>
          </>
        ) : (
          <div className="tj-field">
            <div className="lbl">API2Trade UUID</div>
            <input
              className="tj-input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="74c175c3-…"
            />
          </div>
        )}
        {info && (
          <div className="pl-empty" style={{ marginBottom: 12 }}>
            {info}
          </div>
        )}
        <button
          type="button"
          className="tb-addbtn"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const res = await addAdminCloudAccount({
                mode,
                email,
                login,
                password: mode === "register" ? password : undefined,
                server: mode === "register" ? server : undefined,
                name: name || undefined,
                accountId: mode === "map" ? accountId : undefined,
              });
              setPassword("");
              if (!res.result.ok) {
                throw new Error(res.result.error || "Koppelen mislukt");
              }
              return `Gekoppeld · ${res.result.login} · ${res.result.written} trades.`;
            })
          }
        >
          {mode === "register" ? "Account aanmaken + sync" : "UUID koppelen + sync"}
        </button>
      </section>

      <section className="tj-panel">
        <div className="ttl">Gekoppelde accounts</div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Lid</th>
                <th>MT5</th>
                <th>Status</th>
                <th>Sync</th>
                <th style={{ textAlign: "right" }}>Acties</th>
              </tr>
            </thead>
            <tbody>
              {(cloud?.accounts || []).map((a: CloudAccountRow) => (
                <tr key={a.accountId}>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {a.displayName || a.email}
                    </div>
                    <div className="pl-sub2">{a.email}</div>
                  </td>
                  <td>
                    <div>{a.login}</div>
                    <div className="pl-sub2">{a.server || a.platform}</div>
                  </td>
                  <td>
                    <span
                      className={`status-chip${a.status === "active" && a.vendorConnected ? " on" : ""}${a.status === "error" ? " off" : ""}`}
                    >
                      {a.status}
                      {a.vendorConnected ? "" : " · niet bij vendor"}
                    </span>
                    {a.lastError ? (
                      <div className="pl-sub2">{a.lastError}</div>
                    ) : null}
                  </td>
                  <td>
                    {a.lastSyncAt
                      ? new Date(a.lastSyncAt).toLocaleString("nl-NL")
                      : "—"}
                    <div className="pl-sub2">{a.lastTradeCount} trades</div>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        type="button"
                        className="tb-addbtn"
                        style={{ fontSize: 11.5, padding: "8px 12px" }}
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const res = await syncAdminCloudAccounts(a.accountId);
                            const one = res.results[0];
                            if (!one?.ok) throw new Error(one?.error || "Sync mislukt");
                            return `Sync ${one.login}: ${one.written} trades.`;
                          })
                        }
                      >
                        Sync
                      </button>
                      {a.source !== "seed" && (
                        <button
                          type="button"
                          className="pl-reset-btn"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`Ontkoppel ${a.email}?`)) return;
                            void run(async () => {
                              await unlinkAdminCloudAccount(a.accountId, false);
                              return "Ontkoppeld in de app. Account blijft bij API2Trade.";
                            });
                          }}
                        >
                          Ontkoppel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cloud?.accounts.length && (
            <div className="tj-empty">Nog geen cloud-accounts.</div>
          )}
        </div>
      </section>
    </>
  );
}

function CoursesTab({
  courses,
  editing,
  setEditing,
  onChange,
}: {
  courses: Course[];
  editing: Course | null;
  setEditing: (c: Course | null) => void;
  onChange: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await saveAdminCourse({ title: title.trim(), description: "", published: false, chapters: [] });
    setTitle("");
    await onChange();
  }

  return (
    <>
      <section className="tj-panel">
        <div className="ttl">Cursussen</div>
        <form onSubmit={(e) => void create(e)} className="plat-inline-form">
          <input
            className="tj-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nieuwe cursustitel"
          />
          <button className="tb-addbtn" type="submit">
            Aanmaken
          </button>
          <button
            type="button"
            className="pl-reset-btn"
            onClick={async () => {
              await seedStarterCourse();
              await onChange();
            }}
          >
            Voorbeeldcursus
          </button>
        </form>
        <div className="admin-table-wrap" style={{ marginTop: 14 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Status</th>
                <th>Lessen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td>
                    <span className={`status-chip ${c.published ? "on" : ""}`}>
                      {c.published ? "Live" : "Concept"}
                    </span>
                  </td>
                  <td>
                    {c.chapters.reduce((s, ch) => s + ch.lessons.length, 0)}
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button type="button" className="tb-addbtn" style={{ fontSize: 11.5, padding: "8px 12px" }} onClick={() => setEditing(c)}>
                        Bewerk
                      </button>
                      <button
                        type="button"
                        className="pl-reset-btn"
                        onClick={async () => {
                          if (!window.confirm("Cursus verwijderen?")) return;
                          await deleteAdminCourse(c.id);
                          await onChange();
                        }}
                      >
                        Verwijder
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {editing && (
        <CourseEditor
          course={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await onChange();
          }}
        />
      )}
    </>
  );
}

function CourseEditor({
  course,
  onClose,
  onSaved,
}: {
  course: Course;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Course>(course);
  const [busy, setBusy] = useState(false);

  function addChapter() {
    setDraft((c) => ({
      ...c,
      chapters: [
        ...c.chapters,
        {
          id: crypto.randomUUID(),
          title: "Nieuw hoofdstuk",
          order: c.chapters.length + 1,
          lessons: [],
        },
      ],
    }));
  }

  function addLesson(chapterId: string) {
    setDraft((c) => ({
      ...c,
      chapters: c.chapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              lessons: [
                ...ch.lessons,
                {
                  id: crypto.randomUUID(),
                  title: "Nieuwe les",
                  videoUrl: "",
                  body: "",
                  order: ch.lessons.length + 1,
                },
              ],
            }
          : ch,
      ),
    }));
  }

  return (
    <section className="tj-panel">
      <div className="ttl">Bewerk cursus</div>
      <div className="tj-field">
        <div className="lbl">Titel</div>
        <input
          className="tj-input"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </div>
      <div className="tj-field">
        <div className="lbl">Beschrijving</div>
        <textarea
          className="tj-input"
          rows={3}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>
      <label className="plat-check">
        <input
          type="checkbox"
          checked={draft.published}
          onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
        />
        Gepubliceerd
      </label>
      {draft.chapters.map((ch, i) => (
        <div key={ch.id} className="learn-chapter" style={{ marginTop: 16 }}>
          <input
            className="tj-input"
            value={ch.title}
            onChange={(e) => {
              const chapters = [...draft.chapters];
              chapters[i] = { ...ch, title: e.target.value };
              setDraft({ ...draft, chapters });
            }}
          />
          {ch.lessons.map((l, j) => (
            <div key={l.id} className="tj-field" style={{ marginTop: 10 }}>
              <input
                className="tj-input"
                value={l.title}
                onChange={(e) => {
                  const chapters = [...draft.chapters];
                  const lessons = [...ch.lessons];
                  lessons[j] = { ...l, title: e.target.value };
                  chapters[i] = { ...ch, lessons };
                  setDraft({ ...draft, chapters });
                }}
              />
              <input
                className="tj-input"
                style={{ marginTop: 6 }}
                placeholder="Vimeo / YouTube URL"
                value={l.videoUrl}
                onChange={(e) => {
                  const chapters = [...draft.chapters];
                  const lessons = [...ch.lessons];
                  lessons[j] = { ...l, videoUrl: e.target.value };
                  chapters[i] = { ...ch, lessons };
                  setDraft({ ...draft, chapters });
                }}
              />
              <textarea
                className="tj-input"
                style={{ marginTop: 6 }}
                rows={2}
                placeholder="Samenvatting"
                value={l.body}
                onChange={(e) => {
                  const chapters = [...draft.chapters];
                  const lessons = [...ch.lessons];
                  lessons[j] = { ...l, body: e.target.value };
                  chapters[i] = { ...ch, lessons };
                  setDraft({ ...draft, chapters });
                }}
              />
            </div>
          ))}
          <button type="button" className="pl-reset-btn" onClick={() => addLesson(ch.id)}>
            + Les
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button type="button" className="pl-reset-btn" onClick={addChapter}>
          + Hoofdstuk
        </button>
        <button
          type="button"
          className="tb-addbtn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await saveAdminCourse(draft, draft.id);
              await onSaved();
            } finally {
              setBusy(false);
            }
          }}
        >
          Opslaan
        </button>
        <button type="button" className="pl-reset-btn" onClick={onClose}>
          Sluiten
        </button>
      </div>
    </section>
  );
}
