"use client";

import { apiRequest } from "@/lib/api/base-api";
import { postLoginHomePath } from "@/lib/auth/roles";
import type { AuthUser, LoginResultPayload } from "@/lib/auth/types";
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
  /** true ise mevcut oturum bir admin'in başka kullanıcı yerine geçtiği oturumdur. */
  isImpersonating: boolean;
  /** Impersonation aktif değilse null. Aktifse yerine geçen admin bilgisi. */
  impersonatedBy: AuthUser["impersonatedBy"] | null;
  login: (username: string, password: string, rememberMe: boolean) => Promise<LoginResultPayload>;
  completeTotpLogin: (totpChallengeToken: string, code: string, rememberMe: boolean) => Promise<void>;
  refreshMe: () => Promise<void>;
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
      try {
        const me = await apiRequest<AuthUser>("/auth/me");
        if (!cancelled) setUser(me);
      } catch {
        // /auth/me başarısız — büyük olasılıkla access token (kısa ömürlü) yok.
        // Login'e DÜŞMEDEN ÖNCE açıkça refresh dene: /auth/refresh yanıtı user'ı
        // taşır. Böylece "refresh başarılı ama yeni cookie cross-site retry'a
        // anlık yetişmedi" yarışından bağımsız, deterministik karar veririz.
        // (refresh token httpOnly olduğu için JS'ten okunamaz; geçerliliğini
        // ancak refresh çağrısı söyler.)
        try {
          const refreshed = await apiRequest<AuthUser | null>("/auth/refresh", {
            method: "POST",
          });
          if (!cancelled) setUser(refreshed ?? null);
        } catch {
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string, rememberMe: boolean) => {
    const data = await apiRequest<LoginResultPayload>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, rememberMe }),
    });
    if (!data.requiresTotp && data.user) setUser(data.user);
    return data;
  }, []);

  const completeTotpLogin = useCallback(
    async (totpChallengeToken: string, code: string, rememberMe: boolean) => {
      const me = await apiRequest<AuthUser>("/auth/login/totp", {
        method: "POST",
        body: JSON.stringify({
          totpChallengeToken,
          code: code.replace(/\s/g, ""),
          rememberMe,
        }),
      });
      setUser(me);
      router.replace(postLoginHomePath(me));
    },
    [router]
  );

  const refreshMe = useCallback(async () => {
    const me = await apiRequest<AuthUser>("/auth/me");
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<object | null>("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  const impersonatedBy = user?.impersonatedBy ?? null;
  const isImpersonating = impersonatedBy != null;

  const value = useMemo(
    () => ({
      user,
      isReady,
      isImpersonating,
      impersonatedBy,
      login,
      completeTotpLogin,
      refreshMe,
      logout,
    }),
    [user, isReady, isImpersonating, impersonatedBy, login, completeTotpLogin, refreshMe, logout]
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
