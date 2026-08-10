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
import { setAuthTokenGetter, setAsUserOverride } from "@/lib/journal/api-client";
import type { AuthUser } from "@/lib/auth/types";

type AuthContextValue = {
  firebaseUser: User | null;
  profile: AuthUser | null;
  loading: boolean;
  asUser: string | null;
  setAsUser: (uid: string | null) => void;
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
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [asUser, setAsUserState] = useState<string | null>(null);

  const getIdToken = useCallback(async () => {
    const user = getClientAuth().currentUser;
    if (!user) return null;
    return user.getIdToken();
  }, []);

  useEffect(() => {
    setAuthTokenGetter(getIdToken);
  }, [getIdToken]);

  const setAsUser = useCallback((uid: string | null) => {
    setAsUserState(uid);
    setAsUserOverride(uid);
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
        setAsUser(null);
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
  }, [refreshProfile, setAsUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      asUser,
      setAsUser,
      getIdToken,
      async loginEmail(email, password) {
        await signInWithEmailAndPassword(getClientAuth(), email, password);
      },
      async registerEmail(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(
          getClientAuth(),
          email,
          password,
        );
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
      },
      async loginGoogle() {
        await signInWithPopup(getClientAuth(), new GoogleAuthProvider());
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(getClientAuth(), email);
      },
      async logout() {
        setAsUser(null);
        await signOut(getClientAuth());
      },
      refreshProfile,
    }),
    [
      firebaseUser,
      profile,
      loading,
      asUser,
      setAsUser,
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
