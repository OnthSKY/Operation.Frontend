import { getApiBaseUrl } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errorCode?: string | null
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: string | null;
  errorCode?: string | null;
};

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as ApiEnvelope<unknown>).success === "boolean"
  );
}

function joinUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Tam API URL’si (ör. blob indirme); `path` `/` ile başlamalı. */
export function apiUrl(path: string): string {
  return joinUrl(path);
}

function resolveRequestUrl(pathOrUrl: string): string {
  const t = pathOrUrl.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return joinUrl(t);
}

/**
 * JSON parse etmeden ham `Response` döner; Accept-Language, çerez, idempotency ve timeout `apiRequest` ile aynı.
 * Görseller ve diğer binary istekler için kullanın.
 */
export async function apiFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Accept-Language", acceptLanguageHeader());
  const method = (init?.method ?? "GET").toUpperCase();
  ensureIdempotencyKey(headers, method);
  const isFormData =
    typeof FormData !== "undefined" && init?.body != null && init.body instanceof FormData;
  if (init?.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const url = resolveRequestUrl(pathOrUrl);
  const timeoutMs = 25_000;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);
  const external = init?.signal;
  if (external) {
    if (external.aborted) ctrl.abort();
    else external.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  try {
    return await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(0, "network");
  } finally {
    clearTimeout(timeoutId);
  }
}

async function clearSessionOnServer(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
}

/** Bu uçlarda 401 sonrası refresh denenmez (yanlış şifre / refresh kendisi vb.). */
function isAuthRefreshEligible(path: string): boolean {
  const p = path.toLowerCase();
  if (p.includes("/auth/login")) return false;
  if (p.includes("/auth/refresh")) return false;
  if (p.includes("/auth/logout")) return false;
  return true;
}

async function trySessionRefresh(): Promise<boolean> {
  try {
    const r = await apiFetch("/auth/refresh", { method: "POST" });
    const t = await r.text();
    if (!r.ok) return false;
    const p = t ? (JSON.parse(t) as unknown) : null;
    return (
      typeof p === "object" &&
      p !== null &&
      "success" in p &&
      (p as { success: boolean }).success === true
    );
  } catch {
    return false;
  }
}

let unauthorizedRecoveryStarted = false;

function recoverFromUnauthorized(path: string): void {
  if (!isAuthRefreshEligible(path)) return;
  if (typeof window === "undefined") return;
  if (unauthorizedRecoveryStarted) return;
  unauthorizedRecoveryStarted = true;
  void (async () => {
    await clearSessionOnServer();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  })();
}

/** Pass via `init.headers` when retrying the same logical mutation with the same key. */
export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

function ensureIdempotencyKey(headers: Headers, method: string): void {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS" || m === "TRACE") return;
  if (headers.has("Idempotency-Key")) return;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    headers.set("Idempotency-Key", crypto.randomUUID());
  }
}

function acceptLanguageHeader(): string {
  if (typeof window === "undefined") return "tr-TR";
  try {
    const raw = localStorage.getItem("operations.locale");
    if (raw === "en") return "en-US";
  } catch {
    /* ignore */
  }
  return "tr-TR";
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const run = async () => {
    const res = await apiFetch(path, init);
    const text = await res.text();
    return { res, text };
  };

  let { res, text } = await run();

  if (res.status === 401 && isAuthRefreshEligible(path)) {
    const refreshed = await trySessionRefresh();
    if (refreshed) ({ res, text } = await run());
  }

  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    if (res.status === 401) recoverFromUnauthorized(path);
    if (!res.ok) {
      throw new ApiError(res.status, text.slice(0, 200) || res.statusText);
    }
    throw new ApiError(res.status, "Invalid JSON response");
  }

  if (isEnvelope(parsed)) {
    if (!parsed.success) {
      if (res.status === 401) recoverFromUnauthorized(path);
      throw new ApiError(
        res.status,
        (parsed.error && String(parsed.error).trim()) || "Request failed",
        parsed.errorCode != null && String(parsed.errorCode).trim()
          ? String(parsed.errorCode).trim()
          : undefined
      );
    }
    if (!res.ok) {
      if (res.status === 401) recoverFromUnauthorized(path);
      throw new ApiError(
        res.status,
        (parsed.error && String(parsed.error).trim()) || res.statusText,
        parsed.errorCode != null && String(parsed.errorCode).trim()
          ? String(parsed.errorCode).trim()
          : undefined
      );
    }
    // API: JsonIgnoreCondition.WhenWritingNull → Ok(null) omits `data`; key absent is valid.
    if (
      parsed.data === undefined &&
      res.status !== 204 &&
      Object.prototype.hasOwnProperty.call(parsed, "data")
    ) {
      throw new ApiError(
        res.status,
        "Invalid API response: success true but data is missing."
      );
    }
    return parsed.data as T;
  }

  if (!res.ok) {
    if (res.status === 401) recoverFromUnauthorized(path);
    let message = res.statusText || "Request failed";
    if (parsed && typeof parsed === "object") {
      const body = parsed as { message?: string; title?: string; error?: string };
      if (body.error) message = String(body.error);
      else if (body.message) message = body.message;
      else if (body.title) message = body.title;
    } else if (text) message = text.slice(0, 200);
    throw new ApiError(res.status, message);
  }

  if (!text) return undefined as T;
  return parsed as T;
}
