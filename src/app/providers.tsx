"use client";

import { AuthProvider } from "@/lib/auth/AuthContext";
import { I18nProvider } from "@/i18n/context";
import { AppToastify } from "@/shared/components/AppToastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <I18nProvider>
      <QueryClientProvider client={client}>
        <AuthProvider>
          {children}
          <AppToastify />
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
