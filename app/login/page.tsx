"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/components/i18n/LocaleProvider";
import { hardReplace } from "@/lib/navigation";

function mapAuthError(err: unknown, t: (key: string) => string): string {
  const raw =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code || "")
      : "";
  const message = err instanceof Error ? err.message : "";
  const fromMessage = message.match(/auth\/[a-z0-9-]+/i)?.[0] || "";
  const code = raw || fromMessage || message;

  if (
    code.includes("auth/invalid-credential") ||
    code.includes("auth/wrong-password") ||
    code.includes("auth/user-not-found") ||
    code.includes("auth/invalid-login-credentials")
  ) {
    return t("login.wrongCredentials");
  }
  if (code.includes("auth/email-already-in-use")) {
    return t("login.emailInUse");
  }
  if (code.includes("auth/weak-password")) {
    return t("login.weakPassword");
  }
  if (code.includes("auth/invalid-email")) {
    return t("login.invalidEmail");
  }
  if (code.includes("auth/too-many-requests")) {
    return t("login.tooMany");
  }
  if (code.includes("auth/popup-closed-by-user")) {
    return t("login.googleCancelled");
  }
  if (code.includes("auth/unauthorized-domain")) {
    return t("login.unauthorizedDomain");
  }
  if (
    code.includes("auth/operation-not-allowed") ||
    code.includes("auth/admin-restricted-operation")
  ) {
    return t("login.googleDisabled");
  }
  if (code.includes("auth/network-request-failed")) {
    return t("login.network");
  }
  if (code.includes("auth/internal-error")) {
    return t("login.firebaseInternal");
  }
  if (message && !message.startsWith("Firebase:")) return message;
  return t("login.generic");
}

function LoginForm() {
  const t = useT();
  const {
    loginEmail,
    registerEmail,
    loginGoogle,
    resetPassword,
    firebaseUser,
    loading,
  } = useAuth();
  const params = useSearchParams();
  const next = useMemo(() => {
    const raw = params.get("next") || "/dashboard";
    if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) {
      return "/dashboard";
    }
    return raw;
  }, [params]);

  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !firebaseUser) return;
    hardReplace(next);
  }, [firebaseUser, loading, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await loginEmail(email, password);
        hardReplace(next);
      } else if (mode === "register") {
        await registerEmail(email, password, displayName);
        hardReplace(next);
      } else {
        await resetPassword(email);
        setInfo(t("login.resetSent"));
      }
    } catch (err) {
      setError(mapAuthError(err, t));
    } finally {
      setBusy(false);
    }
  }

  const subtitle =
    mode === "login"
      ? t("login.subtitleLogin")
      : mode === "register"
        ? t("login.subtitleRegister")
        : t("login.subtitleReset");

  return (
    <div className="auth-card">
      <div className="tb-brand" style={{ marginBottom: 6 }}>
        Trade<span>chain</span>
      </div>
      <div className="pl-sub" style={{ marginBottom: 16 }}>
        {subtitle}
      </div>

      <div className="auth-segments" role="tablist" aria-label={t("login.mode")}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={`auth-segment${mode === "login" ? " active" : ""}`}
          onClick={() => {
            setMode("login");
            setError(null);
            setInfo(null);
          }}
        >
          {t("login.signIn")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={`auth-segment${mode === "register" ? " active" : ""}`}
          onClick={() => {
            setMode("register");
            setError(null);
            setInfo(null);
          }}
        >
          {t("login.register")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "reset"}
          className={`auth-segment${mode === "reset" ? " active" : ""}`}
          onClick={() => {
            setMode("reset");
            setError(null);
            setInfo(null);
          }}
        >
          {t("login.reset")}
        </button>
      </div>

      <form onSubmit={onSubmit}>
        {mode === "register" && (
          <div className="tj-field">
            <div className="lbl">{t("common.name")}</div>
            <input
              className="tj-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder={t("login.namePlaceholder")}
            />
            <div className="hint" style={{ marginTop: 6 }}>
              {t("login.nameHint")}
            </div>
          </div>
        )}
        <div className="tj-field">
          <div className="lbl">{t("common.email")}</div>
          <input
            type="email"
            className="tj-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        {mode !== "reset" && (
          <div className="tj-field">
            <div className="lbl">{t("common.password")}</div>
            <input
              type="password"
              className="tj-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
        )}

        {error && (
          <div className="pl-empty" style={{ marginBottom: 12, color: "var(--bear)" }}>
            {error}
          </div>
        )}
        {info && (
          <div className="pl-empty" style={{ marginBottom: 12 }}>
            {info}
          </div>
        )}

        <button className="tj-savebtn" type="submit" disabled={busy}>
          {busy
            ? t("common.busy")
            : mode === "login"
              ? t("login.submitLogin")
              : mode === "register"
                ? t("login.submitRegister")
                : t("login.submitReset")}
        </button>
      </form>

      {mode !== "reset" && (
        <button
          type="button"
          className="pl-reset-btn"
          style={{ width: "100%", marginTop: 10 }}
          disabled={busy}
          onClick={async () => {
            setError(null);
            setBusy(true);
            try {
              await loginGoogle();
              hardReplace(next);
            } catch (err) {
              setError(mapAuthError(err, t));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("login.google")}
        </button>
      )}
    </div>
  );
}

export default function LoginPage() {
  const t = useT();
  return (
    <div className="auth-shell">
      <header className="auth-shell-nav">
        <Link href="/" className="home-nav-brand">
          Trade<span>chain</span>
        </Link>
        <LanguageSwitcher />
        <Link href="/" className="home-nav-link">
          {t("login.backHome")}
        </Link>
      </header>
      <main className="auth-shell-main">
        <Suspense
          fallback={
            <div className="text-[var(--paper-dim)] text-sm">{t("common.loading")}</div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
