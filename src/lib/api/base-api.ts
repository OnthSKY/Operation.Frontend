import { getApiBaseUrl } from "@/lib/env";
import { clearAuthTokenCookie, getAuthTokenFromDocumentCookie } from "@/lib/auth/auth-cookie";

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

export type ApiRequestInit = RequestInit & { skipAuth?: boolean };

function onUnauthorized(): void {
  clearAuthTokenCookie();
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (!path.startsWith("/login")) {
      window.location.assign("/login");
    }
  }
}

export async function apiRequest<T>(
  path: string,
  init?: ApiRequestInit
): Promise<T> {
  const { skipAuth, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getAuthTokenFromDocumentCookie();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(joinUrl(path), {
    ...rest,
    headers,
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    if (res.status === 401) onUnauthorized();
    if (!res.ok) {
      throw new ApiError(res.status, text.slice(0, 200) || res.statusText);
    }
    throw new ApiError(res.status, "Invalid JSON response");
  }

  if (isEnvelope(parsed)) {
    if (!parsed.success) {
      throw new ApiError(
        res.status,
        (parsed.error && String(parsed.error).trim()) || "Request failed"
      );
    }
    if (!res.ok) {
      if (res.status === 401) onUnauthorized();
      throw new ApiError(
        res.status,
        (parsed.error && String(parsed.error).trim()) || res.statusText
      );
    }
    if (parsed.data === undefined && res.status !== 204) {
      throw new ApiError(
        res.status,
        "Invalid API response: success true but data is missing."
      );
    }
    return parsed.data as T;
  }

  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
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
