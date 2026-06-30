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
  ensureCsrfHeader(headers, method);
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
    const res = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      signal: ctrl.signal,
    });
    rememberCsrfTokenFromResponse(res);
    return res;
  } catch {
    throw new ApiError(0, "network");
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Yalnızca istemci tarafı CSRF cache'ini temizler — sunucuya logout ATMAZ. */
function clearClientCsrf(): void {
  inMemoryCsrfToken = null;
  if (typeof localStorage !== "undefined") {
    try { localStorage.removeItem(CSRF_STORAGE_KEY); } catch { /* ignore */ }
  }
}

/** Bu uçlarda 401 sonrası refresh denenmez (yanlış şifre / refresh kendisi vb.). */
function isAuthRefreshEligible(path: string): boolean {
  const p = path.toLowerCase();
  if (p.includes("/auth/login")) return false;
  if (p.includes("/auth/refresh")) return false;
  if (p.includes("/auth/logout")) return false;
  if (p.includes("/auth/admin-register")) return false;
  return true;
}

/**
 * Refresh token rotation, server tarafında "reuse detection" yapar — aynı token iki kez
 * kullanılırsa tüm session family revoke edilir (saldırı yakalama davranışı). Birden
 * fazla sekme aynı anda 401 alıp paralel `/auth/refresh` atarsa, ikinci POST eski
 * token'ı kullanmış sayılır ve **legitim oturum yanlışlıkla uçar**.
 *
 * Burada sekmeler arası tek bir refresh garantilenir:
 *   - In-memory `refreshInFlight` aynı sekmede çift refresh'i durdurur.
 *   - `localStorage` lock + `BroadcastChannel` sekmeler arası tek-leader yapısı sağlar.
 *   - Lider POST'u atıp sonucu broadcast eder; diğer sekmeler aynı sonucu döner.
 *   - Lider tab kapanırsa/donduysa lock 8 sn sonra "stale" sayılıp başka sekme devreye girer.
 */
const REFRESH_LOCK_KEY = "operations.auth.refresh.lock";
const REFRESH_RESULT_KEY = "operations.auth.refresh.result";
const REFRESH_LOCK_TIMEOUT_MS = 8000;

const refreshChannel: BroadcastChannel | null =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("operations-auth-refresh")
    : null;

type RefreshResultMessage = { type: "refresh-result"; ok: boolean; at: number };

let refreshInFlight: Promise<boolean> | null = null;

function readRefreshLockStartedAt(): number | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { startedAt?: number };
    return typeof parsed.startedAt === "number" ? parsed.startedAt : null;
  } catch {
    return null;
  }
}

function writeRefreshLock(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ startedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

function clearRefreshLock(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  } catch {
    /* ignore */
  }
}

function broadcastRefreshResult(ok: boolean): void {
  const payload: RefreshResultMessage = { type: "refresh-result", ok, at: Date.now() };
  try {
    refreshChannel?.postMessage(payload);
  } catch {
    /* ignore */
  }
  if (typeof localStorage !== "undefined") {
    try {
      // Storage event fallback: BroadcastChannel olmayan tarayıcılarda da diğer sekmeler haber alır.
      localStorage.setItem(REFRESH_RESULT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }
}

function waitForOtherTabRefresh(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      refreshChannel?.removeEventListener("message", onMsg);
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      clearTimeout(timeoutId);
      resolve(ok);
    };
    const onMsg = (e: MessageEvent<RefreshResultMessage>) => {
      if (e.data?.type === "refresh-result") finish(Boolean(e.data.ok));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== REFRESH_RESULT_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as RefreshResultMessage;
        if (parsed?.type === "refresh-result") finish(Boolean(parsed.ok));
      } catch {
        /* ignore */
      }
    };
    refreshChannel?.addEventListener("message", onMsg);
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    // Lider tab donmuş/kapanmış olabilir — timeout'ta false dön, çağıran logout'a düşer.
    const timeoutId = setTimeout(() => finish(false), REFRESH_LOCK_TIMEOUT_MS + 1000);
  });
}

async function performSessionRefresh(): Promise<boolean> {
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

async function trySessionRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  // Başka bir sekme zaten refresh tetikledi mi? (lock taze ise)
  const otherStartedAt = readRefreshLockStartedAt();
  if (
    otherStartedAt != null &&
    Date.now() - otherStartedAt < REFRESH_LOCK_TIMEOUT_MS
  ) {
    refreshInFlight = waitForOtherTabRefresh().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  // Lider biz olalım: lock al, POST at, sonucu broadcast et.
  writeRefreshLock();
  refreshInFlight = (async () => {
    const ok = await performSessionRefresh();
    broadcastRefreshResult(ok);
    return ok;
  })().finally(() => {
    clearRefreshLock();
    refreshInFlight = null;
  });
  return refreshInFlight;
}

let unauthorizedRecoveryStarted = false;

/** Oturum yokken /auth/me 401 — bu sayfalarda login’e zorla yönlendirme yapılmaz. */
function isPublicAuthPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/emergency-admin-register" || pathname.startsWith("/emergency-admin-register/"))
    return true;
  return false;
}

function recoverFromUnauthorized(path: string): void {
  if (!isAuthRefreshEligible(path)) return;
  // /auth/me oturum yoklama ucudur; 401'i normaldir. Buradaki kararı (refresh
  // dene, yoksa login'e götür) AuthProvider verir ve soft router.replace ile
  // yönlendirir. Burada sert window.location.assign yaparsak hem AuthProvider'ın
  // açılış refresh'ini yarıda keseriz hem de Network log'unu sileriz.
  if (path.toLowerCase().includes("/auth/me")) return;
  if (typeof window === "undefined") return;
  if (unauthorizedRecoveryStarted) return;
  unauthorizedRecoveryStarted = true;
  // Gönülsüz 401: sunucuya logout ATMA. Logout artık tüm refresh-family'yi iptal
  // ediyor; geçici bir hatada bunu yapmak hâlâ geçerli olabilecek oturumu kalıcı
  // öldürür ("refresh token var ama login'e atıyor" döngüsü). Sadece istemci CSRF
  // cache'ini temizle + login'e yönlendir; refresh cookie canlı kalsın ki sonraki
  // denemede oturum kendini iyileştirebilsin.
  clearClientCsrf();
  if (!isPublicAuthPath(window.location.pathname)) {
    window.location.assign("/login");
  }
}

/** Pass via `init.headers` when retrying the same logical mutation with the same key. */
export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Idempotency-Key header'ı **otomatik üretilmez** — her fetch çağrısında yeni UUID üretmek
 * çift-tıklama / retry korumasını kırardı (her istek farklı key → backend cache hit yok).
 *
 * Backend `IdempotencyMiddleware` davranışı:
 *   - Header verilirse: 24 saat TTL ile (user, path, key) bazında dedup. Aynı key farklı body
 *     ile gelirse 409 Conflict.
 *   - Header verilmezse: kısa TTL (60 sn) ile (user, path, body-hash) implicit dedup. Bu,
 *     çift-tıklama / network retry'ı UI'dan ek iş yapmadan yakalar.
 *
 * Daha güçlü garantiler için (örn. form-level stabil key) caller `createIdempotencyKey()`
 * çağırıp init.headers['Idempotency-Key'] olarak verebilir; aynı key tüm retry'larda taşınmalı.
 */
function ensureIdempotencyKey(_headers: Headers, _method: string): void {
  // intentional no-op; bkz. yukarıdaki not.
}

/**
 * CSRF double-submit: backend `XSRF-TOKEN` cookie'sini set eder VE her response'a
 * aynı değeri `X-XSRF-TOKEN` header olarak yansıtır.
 *
 * Cross-origin (frontend ≠ backend host): document.cookie cookie'ye erişemez,
 * o yüzden in-memory cache'i öncelikli kaynak yaparız. apiFetch her response'tan
 * header'ı okuyup cache'i günceller (rememberCsrfTokenFromResponse).
 *
 * Same-origin senaryosunda cookie de okunur — fallback olarak.
 */
const CSRF_STORAGE_KEY = "operations.xsrf";
let inMemoryCsrfToken: string | null = null;

function readCsrfFromStorage(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(CSRF_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeCsrfToStorage(token: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
}

function ensureCsrfHeader(headers: Headers, method: string): void {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS" || m === "TRACE") return;
  if (headers.has("X-XSRF-TOKEN")) return;
  const token =
    inMemoryCsrfToken
    ?? readCsrfFromStorage()
    ?? (typeof document !== "undefined" ? readCookie("XSRF-TOKEN") : null);
  if (token) {
    inMemoryCsrfToken = token;
    headers.set("X-XSRF-TOKEN", token);
  }
}

function rememberCsrfTokenFromResponse(res: Response): void {
  const fromHeader = res.headers.get("X-XSRF-TOKEN");
  if (fromHeader && fromHeader !== inMemoryCsrfToken) {
    inMemoryCsrfToken = fromHeader;
    writeCsrfToStorage(fromHeader);
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + escaped + "=([^;]*)")
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
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
