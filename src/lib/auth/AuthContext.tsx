"use client";

import { apiRequest, isSessionUnrecoverable } from "@/lib/api/base-api";
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
        // Login'e düşmeden önce refresh dene; refresh token httpOnly olduğu için
        // geçerliliğini ancak refresh çağrısı söyler.
        try {
          const refreshed = await apiRequest<AuthUser | null>("/auth/refresh", {
            method: "POST",
          });
          if (!refreshed) {
            if (!cancelled) setUser(null);
            return;
          }
          // DOĞRULAMA: refresh 200 + user dönmesi, yeni access cookie'nin tarayıcıya
          // GERÇEKTEN oturduğunu kanıtlamaz (ör. ters proxy Set-Cookie'yi düşürüyorsa
          // refresh "başarılı" görünür ama access cookie yoktur). Bu yüzden access
          // token gerektiren /auth/me'yi tekrar çağırıp teyit ederiz; başarısızsa
          // kullanıcıyı sahte biçimde içeri ALMAYIZ. (Set-Cookie, fetch promise'i
          // çözülmeden önce jar'a yazıldığı için ardışık çağrıda cookie yarışı yoktur.)
          const confirmed = await apiRequest<AuthUser>("/auth/me");
          if (!cancelled) setUser(confirmed);
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

  // base-api'nin SOFT "auth-expired" event'i (sert redirect yerine). Bir 401 refresh
  // ile toparlanamayınca gelir. Burada SON bir deterministik refresh deneriz:
  //   - başarılı → oturumu kurtar (setUser), redirect YOK; react-query kendini toparlar.
  //   - başarısız → oturum gerçekten ölmüş → yumuşak /login (reload yok → flapping yok).
  useEffect(() => {
    let handling = false;
    const goLogin = (reason?: string) => {
      setUser(null);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        router.replace(reason ? `/login?reason=${reason}` : "/login");
      }
    };
    const onExpired = async () => {
      if (handling) return;
      handling = true;
      try {
        // Refresh 200 dönse de session çalışmıyorsa (access cookie oturmuyor) yeniden
        // refresh denemek sahte "kurtardım" sonucu üretip kullanıcıyı boş bir dashboard'da
        // sonsuz 401 döngüsünde tutar. Doğrudan login'e düş.
        if (isSessionUnrecoverable()) {
          goLogin();
          return;
        }
        let refreshed: AuthUser | null = null;
        try {
          refreshed = await apiRequest<AuthUser | null>("/auth/refresh", { method: "POST" });
        } catch {
          refreshed = null;
        }
        // refresh body başarılı olsa bile, ardından tetiklenen bir istek phantom'u
        // yakalamış olabilir — bu durumda oturumu kurtarılmış sayma.
        if (refreshed && !isSessionUnrecoverable()) {
          setUser(refreshed);
          return;
        }
        goLogin();
      } finally {
        handling = false;
      }
    };
    // Circuit breaker: refresh 200 diyor ama access cookie oturmuyor → refresh DENEMEDEN login'e düş.
    const onUnrecoverable = () => goLogin("session");
    window.addEventListener("operations:auth-expired", onExpired as EventListener);
    window.addEventListener("operations:session-unrecoverable", onUnrecoverable as EventListener);
    return () => {
      window.removeEventListener("operations:auth-expired", onExpired as EventListener);
      window.removeEventListener("operations:session-unrecoverable", onUnrecoverable as EventListener);
    };
  }, [router]);

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
