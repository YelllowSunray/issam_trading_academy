"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { hardReplace } from "@/lib/navigation";

function mapAuthError(err: unknown): string {
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
    return "Verkeerd e-mailadres of wachtwoord.";
  }
  if (code.includes("auth/email-already-in-use")) {
    return "Dit e-mailadres heeft al een account. Log in of reset je wachtwoord.";
  }
  if (code.includes("auth/weak-password")) {
    return "Kies een sterker wachtwoord (minimaal 6 tekens).";
  }
  if (code.includes("auth/invalid-email")) {
    return "Ongeldig e-mailadres.";
  }
  if (code.includes("auth/too-many-requests")) {
    return "Te veel pogingen. Probeer later opnieuw.";
  }
  if (code.includes("auth/popup-closed-by-user")) {
    return "Google-login geannuleerd.";
  }
  if (code.includes("auth/network-request-failed")) {
    return "Geen verbinding. Controleer je internet.";
  }
  if (message && !message.startsWith("Firebase:")) return message;
  return "Er ging iets mis. Probeer het opnieuw.";
}

function LoginForm() {
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
    const raw = params.get("next") || "/journal";
    if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) {
      return "/journal";
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
        setInfo("Check je e-mail voor een reset-link.");
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  const subtitle =
    mode === "login"
      ? "Log in op je trading journal"
      : mode === "register"
        ? "Maak een academy-account"
        : "Wachtwoord resetten";

  return (
    <div className="auth-card">
      <div className="tb-brand" style={{ marginBottom: 6 }}>
        Trading<span>Acadamy</span>
      </div>
      <div className="pl-sub" style={{ marginBottom: 16 }}>
        {subtitle}
      </div>

      <div className="auth-segments" role="tablist" aria-label="Auth modus">
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
          Inloggen
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
          Registreren
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
          Reset
        </button>
      </div>

      <form onSubmit={onSubmit}>
        {mode === "register" && (
          <div className="tj-field">
            <div className="lbl">Naam</div>
            <input
              className="tj-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder="Voor- en achternaam"
            />
            <div className="hint" style={{ marginTop: 6 }}>
              Verplicht bij e-mail registratie (Google vult dit automatisch).
            </div>
          </div>
        )}
        <div className="tj-field">
          <div className="lbl">E-mail</div>
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
            <div className="lbl">Wachtwoord</div>
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
            ? "Bezig…"
            : mode === "login"
              ? "Inloggen"
              : mode === "register"
                ? "Account aanmaken"
                : "Reset-link sturen"}
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
              setError(mapAuthError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          Doorgaan met Google
        </button>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-shell">
      <header className="auth-shell-nav">
        <Link href="/" className="home-nav-brand">
          Trading<span>Acadamy</span>
        </Link>
        <Link href="/" className="home-nav-link">
          ← Homepage
        </Link>
      </header>
      <main className="auth-shell-main">
        <Suspense
          fallback={
            <div className="text-[var(--paper-dim)] text-sm">Laden…</div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
