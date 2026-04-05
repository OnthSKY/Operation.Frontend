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

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(joinUrl(path), {
    ...init,
    headers,
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
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
      throw new ApiError(
        res.status,
        (parsed.error && String(parsed.error).trim()) || res.statusText
      );
    }
    // Backend ApiResponse: null Data omitted from JSON (WhenWritingNull) — treat as missing payload bug
    if (parsed.data === undefined && res.status !== 204) {
      throw new ApiError(
        res.status,
        "Invalid API response: success true but data is missing."
      );
    }
    return parsed.data as T;
  }

  if (!res.ok) {
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
