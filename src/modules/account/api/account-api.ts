import { apiRequest } from "@/lib/api/base-api";
import type { MyAuditLogItem, TotpStatusPayload } from "@/lib/auth/types";

export async function fetchTotpStatus(): Promise<TotpStatusPayload> {
  return apiRequest<TotpStatusPayload>("/auth/totp/status");
}

export async function fetchMyAudit(limit = 40): Promise<MyAuditLogItem[]> {
  return apiRequest<MyAuditLogItem[]>(`/auth/me/audit?limit=${limit}`);
}

export async function postTotpSetupStart(): Promise<void> {
  await apiRequest("/auth/totp/setup/start", { method: "POST" });
}

export async function postTotpSetupConfirm(code: string): Promise<void> {
  await apiRequest("/auth/totp/setup/confirm", {
    method: "POST",
    body: JSON.stringify({ code: code.replace(/\s/g, "") }),
  });
}

export async function postTotpSetupCancel(): Promise<void> {
  await apiRequest("/auth/totp/setup/cancel", { method: "POST" });
}

export async function postTotpDisable(password: string, code: string): Promise<void> {
  await apiRequest("/auth/totp/disable", {
    method: "POST",
    body: JSON.stringify({
      password,
      code: code.replace(/\s/g, ""),
    }),
  });
}
