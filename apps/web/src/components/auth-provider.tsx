"use client";

import * as React from "react";
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider, appleProvider } from "@/lib/firebase";
import { api, ApiError } from "@/lib/api";
import type { BackendSession, User } from "@/types";

const STORAGE_KEY = "harmonyhub-session";

type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated";
  user: User | null;
  token: string | null;
};

type AuthContextValue = AuthState & {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    status: "loading",
    user: null,
    token: null,
  });

  const isDummyAuth = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("your-firebase-web-api-key");

  const exchangeIdToken = React.useCallback(async (fbUser: FirebaseUser) => {
    const idToken = await fbUser.getIdToken(true);
    const session = await api.post<BackendSession>("/api/v1/auth/session", { id_token: idToken });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    const user = await api.get<User>("/api/v1/users/me", { authToken: session.access_token });
    setState({ status: "authenticated", user, token: session.access_token });
  }, []);

  // Listen to Firebase auth state (covers reloads, token refreshes)
  React.useEffect(() => {
    if (isDummyAuth) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const session = JSON.parse(stored) as BackendSession;
          api.get<User>("/api/v1/users/me", { authToken: session.access_token })
            .then((user) => {
              setState({ status: "authenticated", user, token: session.access_token });
            })
            .catch(() => {
              localStorage.removeItem(STORAGE_KEY);
              setState({ status: "unauthenticated", user: null, token: null });
            });
          return;
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setState({ status: "unauthenticated", user: null, token: null });
      return;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // Try to restore from local storage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const session = JSON.parse(stored) as BackendSession;
            const user = await api.get<User>("/api/v1/users/me", { authToken: session.access_token });
            setState({ status: "authenticated", user, token: session.access_token });
            return;
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
        setState({ status: "unauthenticated", user: null, token: null });
        return;
      }
      try {
        await exchangeIdToken(fbUser);
      } catch (e) {
        console.error("Failed to exchange Firebase token", e);
        setState({ status: "unauthenticated", user: null, token: null });
      }
    });
    return () => unsub();
  }, [exchangeIdToken, isDummyAuth]);

  const signInWithEmail = React.useCallback(
    async (email: string, password: string) => {
      if (isDummyAuth) {
        const mockToken = `mock-token:${email}`;
        const session = await api.post<BackendSession>("/api/v1/auth/session", { id_token: mockToken });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        const user = await api.get<User>("/api/v1/users/me", { authToken: session.access_token });
        setState({ status: "authenticated", user, token: session.access_token });
        return;
      }
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
    },
    [isDummyAuth],
  );

  const signUpWithEmail = React.useCallback(
    async (email: string, password: string, displayName: string) => {
      if (isDummyAuth) {
        const mockToken = `mock-token:${email}`;
        const session = await api.post<BackendSession>("/api/v1/auth/session", { id_token: mockToken });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        const user = await api.get<User>("/api/v1/users/me", { authToken: session.access_token });
        setState({ status: "authenticated", user, token: session.access_token });
        return;
      }
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
    },
    [isDummyAuth],
  );

  const signInWithGoogle = React.useCallback(async () => {
    if (isDummyAuth) {
      const mockToken = "mock-token:google-user@harmonyhub.local";
      const session = await api.post<BackendSession>("/api/v1/auth/session", { id_token: mockToken });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      const user = await api.get<User>("/api/v1/users/me", { authToken: session.access_token });
      setState({ status: "authenticated", user, token: session.access_token });
      return;
    }
    const auth = getFirebaseAuth();
    await signInWithPopup(auth, googleProvider);
  }, [isDummyAuth]);

  const signInWithApple = React.useCallback(async () => {
    if (isDummyAuth) {
      const mockToken = "mock-token:apple-user@harmonyhub.local";
      const session = await api.post<BackendSession>("/api/v1/auth/session", { id_token: mockToken });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      const user = await api.get<User>("/api/v1/users/me", { authToken: session.access_token });
      setState({ status: "authenticated", user, token: session.access_token });
      return;
    }
    const auth = getFirebaseAuth();
    await signInWithPopup(auth, appleProvider);
  }, [isDummyAuth]);

  const signOut = React.useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    if (!isDummyAuth) {
      const auth = getFirebaseAuth();
      await fbSignOut(auth);
    }
    setState({ status: "unauthenticated", user: null, token: null });
  }, [isDummyAuth]);

  const refreshUser = React.useCallback(async () => {
    if (!state.token) return;
    try {
      const user = await api.get<User>("/api/v1/users/me", { authToken: state.token });
      setState((s) => ({ ...s, user }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        setState({ status: "unauthenticated", user: null, token: null });
      }
    }
  }, [state.token]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithApple,
      signOut,
      refreshUser,
    }),
    [state, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
