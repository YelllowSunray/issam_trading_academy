"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/components/i18n/LocaleProvider";
import { VIP_PLANS } from "@/lib/platform/plans";

export function HomePage() {
  const { firebaseUser, loading } = useAuth();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryHref = firebaseUser ? "/dashboard" : "/login?next=/dashboard";
  const primaryLabel = firebaseUser ? t("home.openPlatform") : t("home.join");
  const features = [
    { title: t("home.f1Title"), body: t("home.f1Body") },
    { title: t("home.f2Title"), body: t("home.f2Body") },
    { title: t("home.f3Title"), body: t("home.f3Body") },
    { title: t("home.f4Title"), body: t("home.f4Body") },
  ];
  const perks = [
    t("vip.perkCalls"),
    t("vip.perkAnalyses"),
    t("vip.perkGroup"),
    t("vip.perkTelegram"),
    t("vip.perkAcademy"),
    t("vip.perkJournal"),
  ];

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
          Trade<span>chain</span>
        </Link>

        <button
          type="button"
          className="home-nav-burger"
          aria-label={t("common.menu")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`home-nav-links${menuOpen ? " open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            {t("home.features")}
          </a>
          <a href="#vip" onClick={() => setMenuOpen(false)}>
            VIP
          </a>
          <a href="#how" onClick={() => setMenuOpen(false)}>
            {t("home.how")}
          </a>
          <LanguageSwitcher />
          {!loading && (
            <>
              {firebaseUser ? (
                <Link
                  href="/dashboard"
                  className="home-nav-cta"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("common.platform")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/login?next=/dashboard"
                    className="home-nav-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("home.login")}
                  </Link>
                  <Link
                    href="/login?next=/dashboard"
                    className="home-nav-cta"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("home.createAccount")}
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
            Trade<span>chain</span>
          </p>
          <h1 className="home-hero-title">
            {t("home.heroTitle1")}
            <br />
            {t("home.heroTitle2")}
          </h1>
          <p className="home-hero-lead">{t("home.heroLead")}</p>
          <div className="home-hero-actions">
            <Link href={primaryHref} className="home-btn home-btn-primary">
              {primaryLabel}
            </Link>
            <a href="#features" className="home-btn home-btn-ghost">
              {t("home.viewFeatures")}
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="home-section">
        <p className="home-eyebrow">{t("home.features")}</p>
        <h2 className="home-section-title">{t("home.featuresTitle")}</h2>
        <p className="home-section-lead">{t("home.featuresLead")}</p>
        <div className="home-feature-list">
          {features.map((f, i) => (
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
        <h2 className="home-section-title">{t("home.vipTitle")}</h2>
        <p className="home-section-lead">{t("home.vipLead")}</p>
        <ul className="vip-perks home-vip-perks">
          {perks.map((p) => (
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
                <div className="vip-badge">{t("vip.mostChosen")}</div>
              ) : null}
              <div className="vip-label">{t(`vip.${plan.id}Label`)}</div>
              <div className="vip-price">
                {plan.priceLabel}
                <span>{t(`vip.${plan.id}Cadence`)}</span>
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
                {t("vip.becomeVip")}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="home-section">
        <p className="home-eyebrow">{t("home.workflow")}</p>
        <h2 className="home-section-title">{t("home.howTitle")}</h2>
        <p className="home-section-lead">{t("home.howLead")}</p>
        <ol className="home-steps">
          <li>
            <span>01</span>
            <div>
              <h3>{t("home.step1Title")}</h3>
              <p>{t("home.step1Body")}</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>{t("home.step2Title")}</h3>
              <p>{t("home.step2Body")}</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>{t("home.step3Title")}</h3>
              <p>{t("home.step3Body")}</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="home-cta">
        <h2 className="home-section-title">{t("home.ctaTitle")}</h2>
        <p className="home-section-lead">{t("home.ctaLead")}</p>
        <Link href={primaryHref} className="home-btn home-btn-primary">
          {primaryLabel}
        </Link>
      </section>

      <footer className="home-footer">
        <span className="home-nav-brand">
          Trade<span>chain</span>
        </span>
        <span>{t("home.footer")}</span>
      </footer>
    </div>
  );
}
