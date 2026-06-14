"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { impersonationApi } from "@/lib/auth/impersonation-api";
import { postLoginHomePath } from "@/lib/auth/roles";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * "Yerine geç" akışı için tek sorumluluk noktası — backend çağrısı + tüm
 * kullanıcı-kapsamlı önbelleğin invalidate edilmesi + router refresh.
 * UI bileşenleri (modal, banner) doğrudan bunu kullanır; cache/router detayları
 * tekrar etmesin (DRY).
 */
export function useImpersonation() {
  const { refreshMe, isImpersonating, impersonatedBy } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetCaches = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  const start = useCallback(
    async (targetUserId: number) => {
      setPending(true);
      setError(null);
      try {
        const res = await impersonationApi.start(targetUserId);
        await resetCaches();
        await refreshMe();
        router.replace(postLoginHomePath(res.target));
        router.refresh();
        return res;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Yerine geçilemedi.";
        setError(msg);
        throw e;
      } finally {
        setPending(false);
      }
    },
    [refreshMe, resetCaches, router]
  );

  const stop = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const res = await impersonationApi.stop();
      await resetCaches();
      await refreshMe();
      router.replace(postLoginHomePath(res.admin));
      router.refresh();
      return res;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Yöneticiye dönülemedi.";
      setError(msg);
      throw e;
    } finally {
      setPending(false);
    }
  }, [refreshMe, resetCaches, router]);

  return { start, stop, pending, error, isImpersonating, impersonatedBy };
}
