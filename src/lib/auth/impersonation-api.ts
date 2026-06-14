import { apiRequest } from "@/lib/api/base-api";
import type { AuthUser, ImpersonatedBy } from "@/lib/auth/types";

export type StartImpersonationResponse = {
  target: AuthUser;
  admin: ImpersonatedBy;
};

export type StopImpersonationResponse = {
  admin: AuthUser;
};

/**
 * Tek sorumluluk: backend impersonation endpoint'leri için ince istemci.
 * Cookie kullanıldığı için body/header taşımayız.
 */
export const impersonationApi = {
  start: (targetUserId: number) =>
    apiRequest<StartImpersonationResponse>("/impersonation/start", {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    }),

  stop: () =>
    apiRequest<StopImpersonationResponse>("/impersonation/stop", {
      method: "POST",
    }),
};
