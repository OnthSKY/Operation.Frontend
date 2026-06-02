"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchUserAudit,
  type AuditActivityParams,
} from "@/modules/admin/api/audit-api";

export const auditKeys = {
  all: ["admin", "audit"] as const,
  userActivity: (
    userId: number,
    action: string,
    tableName: string,
    dateFrom: string,
    dateTo: string,
    page: number,
    pageSize: number,
  ) =>
    [
      ...auditKeys.all,
      "userActivity",
      userId,
      action,
      tableName,
      dateFrom,
      dateTo,
      page,
      pageSize,
    ] as const,
};

export function useUserAudit(params: AuditActivityParams, enabled = true) {
  return useQuery({
    queryKey: auditKeys.userActivity(
      params.userId,
      params.action ?? "",
      params.tableName ?? "",
      params.dateFrom ?? "",
      params.dateTo ?? "",
      params.page,
      params.pageSize,
    ),
    queryFn: () => fetchUserAudit(params),
    enabled: enabled && params.userId > 0,
  });
}
