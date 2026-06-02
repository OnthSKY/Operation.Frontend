import { apiRequest } from "@/shared/api/client";

/** İşlem öncesi/sonrası kaydın maskelenmiş anlık görüntüsü (alan → değer). */
export type AuditSnapshot = Record<string, unknown>;

/** Tek bir audit/aktivite satırı (admin kullanıcı denetim ekranı). */
export type AuditActivityItem = {
  id: number;
  /** Kaynak tablo adı — ör. "users", "branches". Etikete frontend'de çevrilir. */
  tableName: string;
  /** INSERT | UPDATE | DELETE. */
  action: string;
  /** JSON içindeki anlamlı operasyon ipucu (varsa) — ör. "ADVANCE_CREATE". */
  operation: string | null;
  /** Etkilenen kaydın kimliği (metin). Faz 2'de ilgili kayda gitmek için kullanılır. */
  recordPk: string;
  ipAddress: string | null;
  /** ISO zaman damgası. */
  createdAt: string;
  /** İşlem öncesi anlık görüntü (maskeli). INSERT'te null. Alan-bazlı diff için. */
  oldData: AuditSnapshot | null;
  /** İşlem sonrası anlık görüntü (maskeli). DELETE'te null. */
  newData: AuditSnapshot | null;
};

/** Backend `old_data`/`new_data`'yı JSON metni olarak gönderir; nesneye çevirir. */
function parseSnapshot(raw: unknown): AuditSnapshot | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw as AuditSnapshot;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as AuditSnapshot)
      : null;
  } catch {
    return null;
  }
}

export type AuditActivityPage = {
  items: AuditActivityItem[];
  totalCount: number;
};

export type AuditActivityParams = {
  userId: number;
  action?: string;
  tableName?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export async function fetchUserAudit(
  params: AuditActivityParams,
): Promise<AuditActivityPage> {
  const q = new URLSearchParams();
  if (params.action) q.set("action", params.action);
  if (params.tableName) q.set("tableName", params.tableName);
  if (params.dateFrom) q.set("from", params.dateFrom);
  if (params.dateTo) q.set("to", params.dateTo);
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));

  const result = await apiRequest<{
    items: Record<string, unknown>[];
    totalCount: number;
  }>(`/admin/authorization/users/${params.userId}/audit?${q.toString()}`);

  return {
    items: (result.items ?? []).map((r) => ({
      id: Number(r.id ?? 0),
      tableName: String(r.tableName ?? ""),
      action: String(r.action ?? ""),
      operation: r.operation != null ? String(r.operation) : null,
      recordPk: String(r.recordPk ?? ""),
      ipAddress: r.ipAddress != null ? String(r.ipAddress) : null,
      createdAt: String(r.createdAt ?? ""),
      oldData: parseSnapshot(r.oldData),
      newData: parseSnapshot(r.newData),
    })),
    totalCount: Number(result.totalCount ?? 0) || 0,
  };
}
