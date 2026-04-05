import {
  AUTH_TOKEN_COOKIE_MAX_AGE_SEC,
  AUTH_TOKEN_COOKIE_NAME,
} from "@/lib/auth/constants";

function cookieFlags(): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  return `path=/; max-age=${AUTH_TOKEN_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function getAuthTokenFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${AUTH_TOKEN_COOKIE_NAME}=`;
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    if (p.startsWith(prefix)) {
      const raw = p.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

export function setAuthTokenCookie(token: string): void {
  if (typeof document === "undefined") return;
  const v = encodeURIComponent(token);
  document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=${v}; ${cookieFlags()}`;
}

export function clearAuthTokenCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
