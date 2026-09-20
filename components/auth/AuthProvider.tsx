"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { getClientLocale, translate } from "@/lib/i18n";
import { setAuthTokenGetter, setAsUserOverride } from "@/lib/journal/api-client";
import type { AuthUser, CoachTarget } from "@/lib/auth/types";

const COACH_TARGET_KEY = "tradingacadamy.coachTarget";

type AuthContextValue = {
  firebaseUser: User | null;
  profile: AuthUser | null;
  loading: boolean;
  asUser: string | null;
  coachTarget: CoachTarget | null;
  setAsUser: (uid: string | null) => void;
  setCoachTarget: (target: CoachTarget | null) => void;
  getIdToken: () => Promise<string | null>;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  loginGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredCoachTarget(): CoachTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COACH_TARGET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoachTarget;
    if (!parsed?.uid) return null;
    return {
      uid: parsed.uid,
      displayName: parsed.displayName || "Student",
      email: parsed.email || "",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachTarget, setCoachTargetState] = useState<CoachTarget | null>(() => {
    const stored = readStoredCoachTarget();
    if (stored) setAsUserOverride(stored.uid);
    return stored;
  });

  const getIdToken = useCallback(async () => {
    const user = getClientAuth().currentUser;
    if (!user) return null;
    return user.getIdToken();
  }, []);

  useEffect(() => {
    setAuthTokenGetter(getIdToken);
  }, [getIdToken]);

  const setCoachTarget = useCallback((target: CoachTarget | null) => {
    setCoachTargetState(target);
    setAsUserOverride(target?.uid ?? null);
    try {
      if (target) sessionStorage.setItem(COACH_TARGET_KEY, JSON.stringify(target));
      else sessionStorage.removeItem(COACH_TARGET_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const setAsUser = useCallback(
    (uid: string | null) => {
      if (!uid) {
        setCoachTarget(null);
        return;
      }
      setCoachTarget({
        uid,
        displayName: "Student",
        email: "",
      });
    },
    [setCoachTarget],
  );

  useEffect(() => {
    const stored = readStoredCoachTarget();
    if (stored) {
      setCoachTargetState(stored);
      setAsUserOverride(stored.uid);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setProfile(null);
      return;
    }
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setProfile(null);
      return;
    }
    setProfile((await res.json()) as AuthUser);
  }, [getIdToken]);

  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setCoachTarget(null);
        setLoading(false);
        return;
      }
      try {
        await refreshProfile();
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [refreshProfile, setCoachTarget]);

  const asUser = coachTarget?.uid ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      asUser,
      coachTarget,
      setAsUser,
      setCoachTarget,
      getIdToken,
      async loginEmail(email, password) {
        await signInWithEmailAndPassword(getClientAuth(), email, password);
      },
      async registerEmail(email, password, displayName) {
        const name = displayName.trim();
        if (name.length < 2) {
          throw new Error(translate(getClientLocale(), "auth.nameRequired"));
        }
        const cred = await createUserWithEmailAndPassword(
          getClientAuth(),
          email,
          password,
        );
        await updateProfile(cred.user, { displayName: name });
        const token = await cred.user.getIdToken(true);
        await fetch("/api/me", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ displayName: name }),
        });
      },
      async loginGoogle() {
        await signInWithPopup(getClientAuth(), new GoogleAuthProvider());
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(getClientAuth(), email);
      },
      async logout() {
        setCoachTarget(null);
        await signOut(getClientAuth());
      },
      refreshProfile,
      async updateDisplayName(displayName) {
        const name = displayName.trim();
        if (name.length < 2) {
          throw new Error(translate(getClientLocale(), "auth.nameRequired"));
        }
        const user = getClientAuth().currentUser;
        if (!user) throw new Error(translate(getClientLocale(), "auth.notLoggedIn"));
        await updateProfile(user, { displayName: name });
        await user.getIdToken(true);
        const res = await fetch("/api/me", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ displayName: name }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ||
              translate(getClientLocale(), "auth.profileSaveFailed"),
          );
        }
        setProfile((await res.json()) as AuthUser);
      },
    }),
    [
      firebaseUser,
      profile,
      loading,
      asUser,
      coachTarget,
      setAsUser,
      setCoachTarget,
      getIdToken,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
