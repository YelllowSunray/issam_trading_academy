"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n, useT } from "@/components/i18n/LocaleProvider";
import { dateLocale, type Vars } from "@/lib/i18n";
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
  uploadCourseAsset,
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
  CourseAsset,
  CourseLesson,
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

function rel(
  iso: string | null | undefined,
  t: (key: string, vars?: Vars) => string,
) {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t("admin.justNow");
  if (mins < 60) return t("admin.min", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("admin.hours", { n: hours });
  return t("admin.days", { n: Math.floor(hours / 24) });
}

export function AdminApp() {
  const t = useT();
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
      .catch((e) =>
        setError(e instanceof Error ? e.message : t("common.loadFailed")),
      );
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
      setError(e instanceof Error ? e.message : t("admin.membershipFailed"));
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="journal-main">
      <p className="tj-eyebrow">ADMIN</p>
      <h1 className="tj-title">{t("admin.title")}</h1>
      <p className="pl-sub">
        {t("admin.lead")}
        {profile?.email ? t("admin.signedIn", { email: profile.email }) : ""}
      </p>

      <div className="tb-tabs" style={{ marginBottom: 22 }}>
        {(
          [
            ["overzicht", t("admin.overview")],
            ["coach", t("admin.coach")],
            ["leden", t("admin.members")],
            ["cloud", t("admin.cloud")],
            ["cursussen", t("admin.courses")],
            ["signalen", t("admin.signals")],
            ["community", t("admin.community")],
            ["systeem", t("admin.prices")],
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
              <div className="ttl">{t("gate.coaching")}</div>
              <p className="pl-sub2">{t("admin.coachingLead")}</p>
              <div className="pl-value" style={{ marginTop: 10 }}>
                {overview.members.coachingFree}
              </div>
              <div className="pl-sub2">
                {settings?.coachingPriceNote || t("admin.priceOutside")}
              </div>
            </div>
            <div className="tj-panel">
              <div className="ttl">{t("admin.vipNo11")}</div>
              <p className="pl-sub2">{t("admin.vipLead")}</p>
              <div className="pl-value" style={{ marginTop: 10 }}>
                {overview.members.subscriber}
              </div>
              <div className="pl-sub2">
                {settings?.subscriberPriceLabel || t("admin.vipFrom")}
                {" · "}
                Stripe{" "}
                {overview.stripe.configured
                  ? t("admin.stripeReady")
                  : t("admin.stripeWait")}
              </div>
            </div>
          </div>
          <div className="pl-kpi-grid">
            <Kpi label={t("admin.members")} value={overview.members.total} />
            <Kpi
              label={t("admin.waitingAccess")}
              value={overview.members.none}
            />
            <Kpi
              label={t("admin.expiredKpi")}
              value={overview.members.expired}
            />
            <Kpi
              label={t("admin.journal24h")}
              value={overview.members.journalActiveToday}
            />
            <Kpi
              label={t("admin.online24h")}
              value={overview.members.seenRecently}
            />
            <Kpi
              label={t("admin.courses")}
              value={`${overview.courses.published}/${overview.courses.total}`}
            />
            <Kpi
              label={t("admin.telegramLinked")}
              value={overview.community.telegramLinked}
            />
            <Kpi
              label={t("admin.signalsOpen")}
              value={`${overview.signals.open}/${overview.signals.total}`}
            />
            <Kpi
              label={t("admin.goals")}
              value={`${overview.goals.total} · ${t("admin.membersOf", { n: overview.goals.students })}`}
            />
            <Kpi
              label={t("admin.backtests")}
              value={`${overview.backtests.total} · ${t("admin.membersOf", { n: overview.backtests.students })}`}
            />
            <Kpi
              label={t("admin.certificates")}
              value={overview.certificates.awarded}
            />
            <Kpi
              label={t("admin.disabled")}
              value={overview.members.disabled}
            />
          </div>
        </>
      )}

      {tab === "coach" && (
        <CoachRoster members={members} onOpen={openCoach} />
      )}

      {tab === "leden" && (
        <section className="tj-panel">
          <p className="pl-sub2" style={{ marginBottom: 12 }}>
            {t("admin.membersLead")}
          </p>
          <div className="plat-chip-row">
            {(
              [
                ["all", t("common.all")],
                ["none", t("membership.none")],
                ["subscriber", t("membership.subscriber")],
                ["coaching_free", "1:1"],
                ["expired", t("membership.expired")],
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
            placeholder={t("admin.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ marginBottom: 14, maxWidth: 360 }}
          />
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.member")}</th>
                  <th>{t("admin.access")}</th>
                  <th>{t("nav.journal")}</th>
                  <th>{t("nav.academy")}</th>
                  <th>TG</th>
                  <th>{t("admin.goals")}</th>
                  <th>BT</th>
                  <th>Certs</th>
                  <th>Seen</th>
                  <th style={{ textAlign: "right" }}>{t("admin.actions")}</th>
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
                    <td>{rel(m.lastJournalActivityAt, t)}</td>
                    <td>
                      {m.lessonsCompleted}/{m.lessonsTotal}
                    </td>
                    <td>
                      {m.telegramLinked
                        ? `@${m.telegramUsername || t("admin.linked")}`
                        : "—"}
                    </td>
                    <td>{m.goalsCount || "—"}</td>
                    <td>{m.backtestsCount || "—"}</td>
                    <td>{m.certificatesCount || "—"}</td>
                    <td>{rel(m.lastSeenAt, t)}</td>
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
                              ? t("admin.upgrade11")
                              : t("admin.set11")}
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
                            {t("admin.stop11")}
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
                            {t("admin.stopSub")}
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
                          {t("admin.coach")}
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
                                  : t("admin.aiBriefFailed"),
                              );
                            } finally {
                              setBusyUid(null);
                            }
                          }}
                        >
                          {t("admin.aiBrief")}
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
                          {m.disabled ? t("admin.enable") : t("admin.disable")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="tj-empty">{t("admin.noMembersFilter")}</div>
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
            <div className="ttl">{t("admin.firebaseBudget")}</div>
            <p className="pl-sub2" style={{ marginBottom: 12 }}>
              {t("admin.killSwitch")}
              {canManageBilling
                ? t("admin.onlyOwnerCanLockEmail", { email: ownerEmail })
                : t("admin.onlyOwnerCanLock")}
            </p>
            <div className="status-chip" style={{ marginBottom: 12 }}>
              {billing?.exceeded ? t("admin.blocked") : t("admin.active")} · €
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
                  {t("admin.lockApp")}
                </button>
                <button
                  type="button"
                  className="pl-reset-btn"
                  onClick={() =>
                    void setBillingExceeded(false, "manual_unlock").then(setBilling)
                  }
                >
                  {t("admin.unlock")}
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
  const t = useT();
  if (member.role === "admin") {
    return (
      <div className="access-cell">
        <span className="status-chip on">{t("common.admin")}</span>
        <div className="pl-sub2">{t("admin.fullAccess")}</div>
      </div>
    );
  }
  if (member.membership === "subscriber") {
    return (
      <div className="access-cell">
        <span className="status-chip on">{t("membership.subscriber")}</span>
        <div className="pl-sub2">{t("admin.stripeNo11")}</div>
      </div>
    );
  }
  if (member.membership === "coaching_free") {
    return (
      <div className="access-cell">
        <span className="status-chip on">{t("membership.coaching_free")}</span>
        <div className="pl-sub2">{t("admin.notViaStripe")}</div>
      </div>
    );
  }
  if (member.membership === "expired") {
    return (
      <div className="access-cell">
        <span className="status-chip off">{t("membership.expired")}</span>
        <div className="pl-sub2">{t("admin.wasSubscribed")}</div>
      </div>
    );
  }
  return (
    <div className="access-cell">
      <span className="status-chip">{t("membership.none")}</span>
      <div className="pl-sub2">{t("admin.wait11OrStripe")}</div>
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
  const { t, locale } = useI18n();
  const rows = members
    .filter((m) => m.role !== "admin")
    .slice()
    .sort((a, b) => {
      const aT = a.lastJournalActivityAt || "";
      const bT = b.lastJournalActivityAt || "";
      if (aT !== bT) return bT.localeCompare(aT);
      return a.displayName.localeCompare(b.displayName, locale);
    });

  return (
    <section className="tj-panel">
      <div className="ttl">{t("admin.coach")}</div>
      <p className="pl-sub2" style={{ marginBottom: 14 }}>
        {t("admin.coachLead")}
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
                {t("nav.journal")} {rel(m.lastJournalActivityAt, t)} · {t("nav.academy")}{" "}
                {m.lessonsCompleted}/{m.lessonsTotal} · TG{" "}
                {m.telegramLinked ? `@${m.telegramUsername || "ok"}` : "—"} ·{" "}
                {m.goalsCount} {t("admin.goals").toLowerCase()} · {m.backtestsCount}{" "}
                {t("admin.backtests").toLowerCase()} · {m.certificatesCount} certs
              </div>
            </div>
            <div className="coach-banner-nav">
              {(
                [
                  ["/dashboard", t("nav.dashboard")],
                  ["/journal", t("nav.journal")],
                  ["/journal#backtest", t("coach.backtest")],
                  ["/signals", t("nav.signals")],
                  ["/learn", t("nav.academy")],
                  ["/learn/certificates", t("coach.certificates")],
                  ["/community", t("nav.community")],
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
      {!rows.length && <div className="tj-empty">{t("admin.noMembers")}</div>}
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
  const t = useT();
  const [subscriberPriceLabel, setSubscriberPriceLabel] = useState(
    settings.subscriberPriceLabel,
  );
  const [coachingPriceNote, setCoachingPriceNote] = useState(
    settings.coachingPriceNote,
  );
  const [info, setInfo] = useState<string | null>(null);

  return (
    <section className="tj-panel">
      <div className="ttl">{t("admin.vipPlus11")}</div>
      <p className="pl-sub2" style={{ marginBottom: 16 }}>
        {t("admin.pricingLead")}{" "}
        <code>STRIPE_PRICE_MONTHLY</code> ({t("common.or")} <code>STRIPE_PRICE_ID</code>),{" "}
        <code>STRIPE_PRICE_QUARTERLY</code>,{" "}
        <code>STRIPE_PRICE_SEMIANNUAL</code>, <code>STRIPE_PRICE_YEARLY</code>.
      </p>
      <div className="pl-kpi-grid" style={{ marginBottom: 16 }}>
        {VIP_PLANS.map((p) => (
          <Kpi
            key={p.id}
            label={t(`vip.${p.id}Label`)}
            value={`${p.priceLabel}${t(`vip.${p.id}Cadence`)}`}
          />
        ))}
      </div>
      <div className="tj-field">
        <div className="lbl">{t("admin.coachingOutside")}</div>
        <textarea
          className="tj-input"
          rows={2}
          value={coachingPriceNote}
          onChange={(e) => setCoachingPriceNote(e.target.value)}
        />
        <div className="hint" style={{ marginTop: 6 }}>
          {t("admin.coachingPlaceholder")}
        </div>
      </div>
      <div className="tj-field">
        <div className="lbl">{t("admin.platformSub")}</div>
        <input
          className="tj-input"
          value={subscriberPriceLabel}
          onChange={(e) => setSubscriberPriceLabel(e.target.value)}
          placeholder={t("admin.vipFrom")}
        />
        <div className="hint" style={{ marginTop: 6 }}>
          {t("admin.paywallHint")}{" "}
          {stripeReady ? t("admin.stripeCanCheckout") : t("admin.stripeNeedIds")}
        </div>
      </div>
      {info && <div className="pl-empty">{info}</div>}
      <button
        type="button"
        className="tb-addbtn"
        onClick={async () => {
          await onSave({ subscriberPriceLabel, coachingPriceNote });
          setInfo(t("admin.pricesSaved"));
        }}
      >
        {t("common.save")}
      </button>
      <p className="pl-sub2" style={{ marginTop: 16 }}>
        Webhook: <code>/api/stripe/webhook</code> · env:{" "}
        <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRICE_MONTHLY</code> ({t("common.or")}{" "}
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
  const t = useT();
  const [url, setUrl] = useState(settings.telegramInviteUrl);
  const [label, setLabel] = useState(settings.telegramLabel);
  const [note, setNote] = useState(settings.communityNote);
  const [vipChat, setVipChat] = useState(settings.telegramVipChatId || "");
  const [normalChat, setNormalChat] = useState(settings.telegramNormalChatId || "");
  const [info, setInfo] = useState<string | null>(null);

  return (
    <section className="tj-panel">
      <div className="ttl">{t("admin.telegramGroups")}</div>
      <p className="pl-sub2" style={{ marginBottom: 14 }}>
        {t("admin.telegramLead")}
      </p>
      <div className="tj-field">
        <div className="lbl">{t("admin.label")}</div>
        <input className="tj-input" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="tj-field">
        <div className="lbl">{t("admin.vipChatId")}</div>
        <input
          className="tj-input"
          value={vipChat}
          onChange={(e) => setVipChat(e.target.value)}
          placeholder="-100…"
        />
      </div>
      <div className="tj-field">
        <div className="lbl">{t("admin.normalChatId")}</div>
        <input
          className="tj-input"
          value={normalChat}
          onChange={(e) => setNormalChat(e.target.value)}
          placeholder="-100…"
        />
      </div>
      <div className="tj-field">
        <div className="lbl">{t("admin.fallbackInvite")}</div>
        <input
          className="tj-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://t.me/+"
        />
      </div>
      <div className="tj-field">
        <div className="lbl">{t("admin.memberCopy")}</div>
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
          setInfo(t("common.saved"));
        }}
      >
        {t("common.save")}
      </button>
    </section>
  );
}

function SignalsTab() {
  const t = useT();
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
      .catch((e) =>
        setError(e instanceof Error ? e.message : t("common.loadFailed")),
      );
  }

  useEffect(() => {
    load();
  }, [t]);

  return (
    <section className="tj-panel">
      <div className="ttl">{t("admin.signals")}</div>
      <p className="pl-sub2" style={{ marginBottom: 14 }}>
        {t("admin.signalsLead")}
      </p>
      {error && <div className="pl-empty">{error}</div>}
      <div className="tj-grid3">
        <div className="tj-field">
          <div className="lbl">{t("journal.instrument")}</div>
          <input
            className="tj-input"
            value={form.instrument}
            onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
          />
        </div>
        <div className="tj-field">
          <div className="lbl">{t("journal.direction")}</div>
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
          <div className="lbl">{t("admin.status")}</div>
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
          <div className="lbl">{t("journal.entry")}</div>
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
            setError(e instanceof Error ? e.message : t("common.failed"));
          } finally {
            setBusy(false);
          }
        }}
      >
        {form.id ? t("admin.updateSignal") : t("admin.postSignal")}
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
                {t("admin.edit")}
              </button>
              <button
                type="button"
                className="pl-reset-btn"
                onClick={async () => {
                  await deleteAdminSignal(s.id);
                  load();
                }}
              >
                {t("common.remove")}
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
  const { t, locale } = useI18n();
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
      onError(e instanceof Error ? e.message : t("admin.cloudActionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="tj-panel" style={{ marginBottom: 16 }}>
        <div className="ttl">{t("admin.cloudTitle")}</div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          {t("admin.cloudLead")} {t("admin.issamLinked")}
        </p>
        {!cloud?.configured && (
          <div className="pl-empty" style={{ marginBottom: 12 }}>
            {t("admin.apiKeyMissing")}
          </div>
        )}
        {cloud?.vendorError && (
          <div className="pl-empty" style={{ marginBottom: 12 }}>
            Vendor: {cloud.vendorError}
          </div>
        )}
        <div className="pl-sub2" style={{ marginBottom: 12 }}>
          {t("admin.vendorLogin")}{" "}
          {cloud?.seed.vendorOwnerEmail || "cryptozayn@gmail.com"}
          <br />
          {t("admin.firstOwner")} {cloud?.seed.email || "ia.lieveldd@gmail.com"}{" "}
          / login {cloud?.seed.login}
          <br />
          {t("admin.vendorAccounts", { n: cloud?.vendor.length ?? 0 })}
        </div>
        <button
          type="button"
          className="tb-addbtn"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const res = await syncAdminCloudAccounts();
              const ok = res.results.filter((r) => r.ok).length;
              return t("admin.syncDone", { ok, total: res.results.length });
            })
          }
        >
          {busy ? t("common.busy") : t("admin.syncAll")}
        </button>
      </section>

      <section className="tj-panel" style={{ marginBottom: 16 }}>
        <div className="ttl">{t("admin.linkStudent")}</div>
        <div className="plat-chip-row" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`plat-chip${mode === "register" ? " active" : ""}`}
            onClick={() => setMode("register")}
          >
            {t("admin.newViaApi")}
          </button>
          <button
            type="button"
            className={`plat-chip${mode === "map" ? " active" : ""}`}
            onClick={() => setMode("map")}
          >
            {t("admin.existingUuid")}
          </button>
        </div>
        <div className="tj-field">
          <div className="lbl">{t("common.student")}</div>
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
          <div className="lbl">{t("admin.mt5Login")}</div>
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
              <div className="lbl">{t("admin.brokerServer")}</div>
              <input
                className="tj-input"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder={t("admin.serverPlaceholder")}
              />
            </div>
            <div className="tj-field">
              <div className="lbl">{t("common.password")}</div>
              <input
                className="tj-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("admin.investorHint")}
                autoComplete="new-password"
              />
            </div>
            <div className="tj-field">
              <div className="lbl">{t("admin.nameOptional")}</div>
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
                throw new Error(res.result.error || t("admin.linkFailed"));
              }
              return t("admin.linkedResult", {
                login: res.result.login,
                n: res.result.written,
              });
            })
          }
        >
          {mode === "register" ? t("admin.createSync") : t("admin.linkSync")}
        </button>
      </section>

      <section className="tj-panel">
        <div className="ttl">{t("admin.linkedAccounts")}</div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.member")}</th>
                <th>MT5</th>
                <th>{t("admin.status")}</th>
                <th>Sync</th>
                <th style={{ textAlign: "right" }}>{t("admin.actions")}</th>
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
                      {a.vendorConnected ? "" : t("admin.notAtVendor")}
                    </span>
                    {a.lastError ? (
                      <div className="pl-sub2">{a.lastError}</div>
                    ) : null}
                  </td>
                  <td>
                    {a.lastSyncAt
                      ? new Date(a.lastSyncAt).toLocaleString(dateLocale(locale))
                      : "—"}
                    <div className="pl-sub2">
                      {a.lastTradeCount} {t("common.trades")}
                    </div>
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
                            if (!one?.ok) throw new Error(one?.error || t("admin.syncFailed"));
                            return t("admin.syncOne", {
                              login: one.login,
                              n: one.written,
                            });
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
                            if (!window.confirm(t("admin.unlinkConfirm", { email: a.email }))) return;
                            void run(async () => {
                              await unlinkAdminCloudAccount(a.accountId, false);
                              return t("admin.unlinked");
                            });
                          }}
                        >
                          {t("admin.unlink")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cloud?.accounts.length && (
            <div className="tj-empty">{t("admin.noCloud")}</div>
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
  const t = useT();
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
        <div className="ttl">{t("admin.courses")}</div>
        <p className="pl-sub2" style={{ marginBottom: 12 }}>
          {t("admin.coursesLead")}
        </p>
        <form onSubmit={(e) => void create(e)} className="plat-inline-form">
          <input
            className="tj-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("admin.newCourseTitle")}
          />
          <button className="tb-addbtn" type="submit">
            {t("admin.create")}
          </button>
          <button
            type="button"
            className="pl-reset-btn"
            onClick={async () => {
              await seedStarterCourse();
              await onChange();
            }}
          >
            {t("admin.sampleCourse")}
          </button>
        </form>
        <div className="admin-table-wrap" style={{ marginTop: 14 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.courseTitle")}</th>
                <th>{t("admin.status")}</th>
                <th>{t("common.lessons")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td>
                    <span className={`status-chip ${c.published ? "on" : ""}`}>
                      {c.published ? t("admin.live") : t("admin.draft")}
                    </span>
                  </td>
                  <td>
                    {c.chapters.reduce((s, ch) => s + ch.lessons.length, 0)}
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button type="button" className="tb-addbtn" style={{ fontSize: 11.5, padding: "8px 12px" }} onClick={() => setEditing(c)}>
                        {t("admin.edit")}
                      </button>
                      <button
                        type="button"
                        className="pl-reset-btn"
                        onClick={async () => {
                          if (!window.confirm(t("admin.deleteCourseConfirm"))) return;
                          await deleteAdminCourse(c.id);
                          await onChange();
                        }}
                      >
                        {t("common.delete")}
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
  const t = useT();
  const [draft, setDraft] = useState<Course>(course);
  const [busy, setBusy] = useState(false);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function patchLesson(
    chapterIndex: number,
    lessonIndex: number,
    patch: Partial<CourseLesson>,
  ) {
    setDraft((c) => {
      const chapters = [...c.chapters];
      const chapter = chapters[chapterIndex];
      const lessons = [...chapter.lessons];
      lessons[lessonIndex] = { ...lessons[lessonIndex], ...patch };
      chapters[chapterIndex] = { ...chapter, lessons };
      return { ...c, chapters };
    });
  }

  async function onUpload(
    kind: "pdf" | "video",
    file: File,
    chapterIndex: number,
    lessonIndex: number,
    lesson: CourseLesson,
  ) {
    const key = `${lesson.id}:${kind}:${file.name}`;
    setUploadKey(key);
    setUploadError(null);
    try {
      const asset = await uploadCourseAsset(kind, file);
      if (kind === "video") {
        patchLesson(chapterIndex, lessonIndex, { videoFile: asset });
      } else {
        patchLesson(chapterIndex, lessonIndex, {
          pdfs: [...(lesson.pdfs || []), asset],
        });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t("admin.uploadFailed"));
    } finally {
      setUploadKey(null);
    }
  }

  function addChapter() {
    setDraft((c) => ({
      ...c,
      chapters: [
        ...c.chapters,
        {
          id: crypto.randomUUID(),
          title: t("admin.newChapter"),
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
                  title: t("admin.newLesson"),
                  videoUrl: "",
                  videoFile: null,
                  pdfs: [],
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
      <div className="ttl">{t("admin.editCourse")}</div>
      <div className="tj-field">
        <div className="lbl">{t("admin.courseTitle")}</div>
        <input
          className="tj-input"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </div>
      <div className="tj-field">
        <div className="lbl">{t("admin.description")}</div>
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
        {t("admin.published")}
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
                onChange={(e) => patchLesson(i, j, { title: e.target.value })}
              />
              <input
                className="tj-input"
                style={{ marginTop: 6 }}
                placeholder={t("admin.videoUrlPlaceholder")}
                value={l.videoUrl}
                onChange={(e) => patchLesson(i, j, { videoUrl: e.target.value })}
              />
              <div className="course-asset-row">
                <label className="pl-reset-btn">
                  {uploadKey?.startsWith(`${l.id}:video:`)
                    ? t("admin.videoLoading")
                    : t("admin.uploadVideo")}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    hidden
                    disabled={Boolean(uploadKey)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void onUpload("video", file, i, j, l);
                    }}
                  />
                </label>
                {l.videoFile ? (
                  <span className="pl-sub2">
                    {l.videoFile.name}
                    <button
                      type="button"
                      className="pl-reset-btn"
                      style={{ marginLeft: 8 }}
                      onClick={() => patchLesson(i, j, { videoFile: null })}
                    >
                      {t("common.remove")}
                    </button>
                  </span>
                ) : (
                  <span className="pl-sub2">{t("admin.orPaste")}</span>
                )}
              </div>
              <div className="course-asset-row">
                <label className="pl-reset-btn">
                  {t("admin.uploadPdf")}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    hidden
                    disabled={Boolean(uploadKey)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void onUpload("pdf", file, i, j, l);
                    }}
                  />
                </label>
                <span className="pl-sub2">
                  {(l.pdfs || []).length
                    ? `${l.pdfs!.length} PDF${l.pdfs!.length === 1 ? "" : "s"}`
                    : "Slides, notes, homework"}
                </span>
              </div>
              {(l.pdfs || []).map((pdf: CourseAsset) => (
                <div key={pdf.path || pdf.url} className="course-asset-item">
                  {pdf.name}
                  <button
                    type="button"
                    className="pl-reset-btn"
                    onClick={() =>
                      patchLesson(i, j, {
                        pdfs: (l.pdfs || []).filter((p) => p !== pdf),
                      })
                    }
                  >
                    {t("common.remove")}
                  </button>
                </div>
              ))}
              <textarea
                className="tj-input"
                style={{ marginTop: 6 }}
                rows={2}
                placeholder={t("admin.summary")}
                value={l.body}
                onChange={(e) => patchLesson(i, j, { body: e.target.value })}
              />
            </div>
          ))}
          <button type="button" className="pl-reset-btn" onClick={() => addLesson(ch.id)}>
            {t("admin.addLesson")}
          </button>
        </div>
      ))}
      {uploadError && <div className="pl-empty">{uploadError}</div>}
      {uploadKey && <p className="pl-sub2">{t("admin.uploading")}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button type="button" className="pl-reset-btn" onClick={addChapter}>
          {t("admin.addChapter")}
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
          {t("common.save")}
        </button>
        <button type="button" className="pl-reset-btn" onClick={onClose}>
          {t("admin.close")}
        </button>
      </div>
    </section>
  );
}
