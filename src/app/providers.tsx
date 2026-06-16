"use client";

import { AuthProvider } from "@/lib/auth/AuthContext";
import { I18nProvider } from "@/i18n/context";
import { AppToastify } from "@/shared/components/AppToastify";
import { BackgroundRefetchIndicator } from "@/shared/components/BackgroundRefetchIndicator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/shared/api/client";

/**
 * Yavaş/flaky internet için akıllı retry stratejisi.
 *
 * Query (GET) retry:
 *   - 4xx (auth, validation, not-found) → ASLA retry — kullanıcı/sunucu hatası
 *   - 5xx, network (status=0) → 2 deneme, exponential backoff
 *
 * Mutation (POST/PUT/DELETE) retry:
 *   - 4xx → ASLA — duplicate yazımı tetikleyebilir
 *   - 5xx/network → 1 deneme (idempotency-key middleware backend'de aktif olduğundan güvenli)
 *
 * Exponential backoff: 1s → 2s → 4s (max 8s). Jitter eklenir, flaky network'te
 * "thundering herd" oluşmaz.
 */
function shouldRetry(failureCount: number, error: unknown, maxAttempts: number): boolean {
  if (failureCount >= maxAttempts) return false;
  // ApiError var ve client error (4xx) ise retry yok
  if (error instanceof ApiError) {
    const status = (error as ApiError).status;
    if (status >= 400 && status < 500) return false;
  }
  return true;
}

function backoffDelay(attemptIndex: number): number {
  // 0→1000, 1→2000, 2→4000, cap 8000; ±20% jitter
  const base = Math.min(8000, 1000 * 2 ** attemptIndex);
  const jitter = base * (Math.random() * 0.4 - 0.2);
  return Math.max(500, base + jitter);
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, err) => shouldRetry(count, err, 2),
            retryDelay: backoffDelay,
          },
          mutations: {
            retry: (count, err) => shouldRetry(count, err, 1),
            retryDelay: backoffDelay,
          },
        },
      })
  );

  return (
    <I18nProvider>
      <QueryClientProvider client={client}>
        <AuthProvider>
          {children}
          <BackgroundRefetchIndicator />
          <AppToastify />
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
