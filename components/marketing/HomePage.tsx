"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { VIP_PERKS, VIP_PLANS } from "@/lib/platform/plans";

const FEATURES = [
  {
    title: "Trade Journal + MT5",
    body: "Per-lid journal, P&L en Expert Advisor-sync. Geen Python-bridge — trades gaan rechtstreeks naar je account.",
  },
  {
    title: "Cursus & community",
    body: "Modules met video + voortgang, plus een Telegram-invite die alleen leden zien.",
  },
  {
    title: "Markets, nieuws & tools",
    body: "TradingView-charts voor XAUUSD, WTI, US500 en BTC, calculators, kalender en een crypto-overzicht.",
  },
  {
    title: "VIP-abonnement",
    body: "Calls, analyses, group calls en VIP-Telegram. €100 / maand tot €1000 / jaar — of 1:1 via Issam.",
  },
];

export function HomePage() {
  const { firebaseUser, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryHref = firebaseUser ? "/dashboard" : "/login?next=/dashboard";
  const primaryLabel = firebaseUser ? "Open platform" : "Word lid";

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <div className="home">
      <header className="home-nav">
        <Link href="/" className="home-nav-brand">
          Trading<span>Acadamy</span>
        </Link>

        <button
          type="button"
          className="home-nav-burger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`home-nav-links${menuOpen ? " open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          <a href="#vip" onClick={() => setMenuOpen(false)}>
            VIP
          </a>
          <a href="#how" onClick={() => setMenuOpen(false)}>
            Hoe het werkt
          </a>
          {!loading && (
            <>
              {firebaseUser ? (
                <Link
                  href="/dashboard"
                  className="home-nav-cta"
                  onClick={() => setMenuOpen(false)}
                >
                  Platform
                </Link>
              ) : (
                <>
                  <Link
                    href="/login?next=/dashboard"
                    className="home-nav-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    Inloggen
                  </Link>
                  <Link
                    href="/login?next=/dashboard"
                    className="home-nav-cta"
                    onClick={() => setMenuOpen(false)}
                  >
                    Account maken
                  </Link>
                </>
              )}
            </>
          )}
        </nav>
      </header>

      <section className="home-hero">
        <div className="home-hero-visual" aria-hidden="true">
          <svg
            className="home-hero-chart"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="homeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BF9B30" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#BF9B30" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="home-hero-area"
              d="M0,620 C180,560 260,700 420,520 C560,360 640,420 780,300 C920,180 1040,260 1180,160 C1280,100 1360,140 1440,90 L1440,900 L0,900 Z"
              fill="url(#homeFill)"
            />
            <path
              className="home-hero-line"
              d="M0,620 C180,560 260,700 420,520 C560,360 640,420 780,300 C920,180 1040,260 1180,160 C1280,100 1360,140 1440,90"
              fill="none"
              stroke="#E7C873"
              strokeWidth="3"
            />
          </svg>
          <div className="home-hero-grid" />
        </div>

        <div className="home-hero-copy">
          <p className="home-hero-brand">
            Trading<span>Acadamy</span>
          </p>
          <h1 className="home-hero-title">
            Discipline in je trades.
            <br />
            Duidelijkheid in je cijfers.
          </h1>
          <p className="home-hero-lead">
            Educatie, Telegram-community, journal en markets — één account voor
            Issam&apos;s TradingAcadamy.
          </p>
          <div className="home-hero-actions">
            <Link href={primaryHref} className="home-btn home-btn-primary">
              {primaryLabel}
            </Link>
            <a href="#features" className="home-btn home-btn-ghost">
              Bekijk features
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="home-section">
        <p className="home-eyebrow">Features</p>
        <h2 className="home-section-title">Alles wat je nodig hebt om beter te traden</h2>
        <p className="home-section-lead">
          Eén plek voor logging, statistieken en academy-begeleiding — geen
          spreadsheets die uit elkaar lopen.
        </p>
        <div className="home-feature-list">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="home-feature"
              style={{ animationDelay: `${0.08 * i}s` }}
            >
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="vip" className="home-section home-section-alt">
        <p className="home-eyebrow">VIP</p>
        <h2 className="home-section-title">Kies je pakket</h2>
        <p className="home-section-lead">
          Geen vage “lidmaatschap”-tekst. Dit krijg je: calls, uitgebreide
          analyses, group calls, VIP-Telegram, academy en journal. Geen
          automatische copy-trading.
        </p>
        <ul className="vip-perks home-vip-perks">
          {VIP_PERKS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <div className="vip-grid">
          {VIP_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`vip-card${plan.highlight ? " featured" : ""}`}
            >
              {plan.highlight ? (
                <div className="vip-badge">Meest gekozen</div>
              ) : null}
              <div className="vip-label">{plan.label}</div>
              <div className="vip-price">
                {plan.priceLabel}
                <span>{plan.cadence}</span>
              </div>
              <Link
                href={
                  firebaseUser
                    ? "/settings"
                    : `/login?next=${encodeURIComponent("/settings")}`
                }
                className="tb-addbtn"
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                Word VIP
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="home-section">
        <p className="home-eyebrow">Workflow</p>
        <h2 className="home-section-title">Van chart naar inzicht</h2>
        <p className="home-section-lead">
          Koppel MetaTrader, laat trades binnenkomen, en review wat echt werkt.
        </p>
        <ol className="home-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Account &amp; EA</h3>
              <p>Log in, genereer je MT5-secret en hang JournalSyncEA aan je chart.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Sync &amp; journal</h3>
              <p>Gesloten trades verschijnen live; vul tags, notities en screenshots aan.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Meet &amp; verbeter</h3>
              <p>Gebruik het P&amp;L dashboard en CSV-export voor reviews met je coach.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="home-cta">
        <h2 className="home-section-title">Klaar om je edge vast te leggen?</h2>
        <p className="home-section-lead">
          Open je journal, koppel MT5, en bouw een meetbaar tradingproces.
        </p>
        <Link href={primaryHref} className="home-btn home-btn-primary">
          {primaryLabel}
        </Link>
      </section>

      <footer className="home-footer">
        <span className="home-nav-brand">
          Trading<span>Acadamy</span>
        </span>
        <span>Journal &amp; P&amp;L voor serieuze traders</span>
      </footer>
    </div>
  );
}
