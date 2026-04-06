import { getApiBaseUrl } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: string | null;
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

async function clearSessionOnServer(): Promise<void> {
  try {
    await fetch(joinUrl("/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* ignore */
  }
}

/** Yanlış şifre (POST login) 401'inde yönlendirme yapılmaz. */
function shouldSkipUnauthorizedRecovery(path: string, init?: RequestInit): boolean {
  if (!path.includes("/auth/login")) return false;
  return (init?.method ?? "GET").toUpperCase() === "POST";
}

function recoverFromUnauthorized(path: string, init?: RequestInit): void {
  if (shouldSkipUnauthorizedRecovery(path, init)) return;
  void (async () => {
    await clearSessionOnServer();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
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

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? "GET").toUpperCase();
  ensureIdempotencyKey(headers, method);
  const isFormData =
    typeof FormData !== "undefined" && init?.body != null && init.body instanceof FormData;
  if (init?.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const url = joinUrl(path);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "network");
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    if (res.status === 401) recoverFromUnauthorized(path, init);
    if (!res.ok) {
      throw new ApiError(res.status, text.slice(0, 200) || res.statusText);
    }
    throw new ApiError(res.status, "Invalid JSON response");
  }

  if (isEnvelope(parsed)) {
    if (!parsed.success) {
      if (res.status === 401) recoverFromUnauthorized(path, init);
      throw new ApiError(
        res.status,
        (parsed.error && String(parsed.error).trim()) || "Request failed"
      );
    }
    if (!res.ok) {
      if (res.status === 401) recoverFromUnauthorized(path, init);
      throw new ApiError(
        res.status,
        (parsed.error && String(parsed.error).trim()) || res.statusText
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
    if (res.status === 401) recoverFromUnauthorized(path, init);
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
