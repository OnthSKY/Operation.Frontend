import { apiRequest } from "@/shared/api/client";

export type AuditLogListItem = {
  id: number;
  tableName: string;
  recordId: number;
  action: string;
  oldData: string | null;
  newData: string | null;
  userId: number | null;
  personnelId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export async function fetchAuditLogs(params: {
  tableName?: string;
  recordId?: number;
  userId?: number;
  from?: string;
  to?: string;
}): Promise<AuditLogListItem[]> {
  const q = new URLSearchParams();
  if (params.tableName) q.set("tableName", params.tableName);
  if (params.recordId != null) q.set("recordId", String(params.recordId));
  if (params.userId != null) q.set("userId", String(params.userId));
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiRequest<AuditLogListItem[]>(`/audit-logs${suffix}`);
}
