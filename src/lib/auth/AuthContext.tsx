"use client";

import { apiRequest } from "@/lib/api/base-api";
import {
  clearAuthTokenCookie,
  getAuthTokenFromDocumentCookie,
  setAuthTokenCookie,
} from "@/lib/auth/auth-cookie";
import type { AuthUser, LoginResponseData } from "@/lib/auth/types";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAuthTokenFromDocumentCookie();
      if (!token) {
        if (!cancelled) setIsReady(true);
        return;
      }
      try {
        const me = await apiRequest<AuthUser>("/auth/me");
        if (!cancelled) setUser(me);
      } catch {
        clearAuthTokenCookie();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiRequest<LoginResponseData>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      skipAuth: true,
    });
    setAuthTokenCookie(data.token);
    setUser(data.user);
    router.replace("/");
  }, [router]);

  const logout = useCallback(() => {
    clearAuthTokenCookie();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, isReady, login, logout }),
    [user, isReady, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
