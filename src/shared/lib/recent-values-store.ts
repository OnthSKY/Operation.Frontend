"use client";

/**
 * Kullanıcının son seçimlerini localStorage'da tutan basit MRU (most-recently-used) store.
 *
 * Kullanım örnekleri:
 *   recordRecent("tx-branch", branchId);              // gider/gelir formu kaydederken
 *   recordRecent("tx-category", "Cleaning");          // kategori seçildiğinde
 *   const last = readLastUsed("tx-branch");           // modal açılışında default için
 *   const top5 = readRecentList("tx-personnel", 5);   // Select tepesi için
 *
 * Tasarım kararları:
 *   • SSR-güvenli — `typeof window === "undefined"` kontrolü
 *   • Her bucket max 8 değer; tekrar seçildiğinde başa taşınır (LRU)
 *   • Bozuk JSON varsa sessiz reset
 *   • Numeric ve string id'ler için karışık destek
 */

const STORAGE_KEY_PREFIX = "operations.recent.";
const MAX_PER_BUCKET = 8;

type RecentValue = string | number;

function readBucket(bucket: string): RecentValue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + bucket);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string" || typeof v === "number");
  } catch {
    return [];
  }
}

function writeBucket(bucket: string, values: RecentValue[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY_PREFIX + bucket,
      JSON.stringify(values.slice(0, MAX_PER_BUCKET))
    );
  } catch {
    /* quota / private mode — sessizce yut */
  }
}

/** Yeni seçim ekle (var olansa başa taşınır, MRU). */
export function recordRecent(bucket: string, value: RecentValue): void {
  if (value === "" || value == null) return;
  const cur = readBucket(bucket);
  const next = [value, ...cur.filter((v) => v !== value)];
  writeBucket(bucket, next);
}

/** Son kullanılan tek değer (formlar için default seed). */
export function readLastUsed(bucket: string): RecentValue | null {
  const cur = readBucket(bucket);
  return cur.length > 0 ? cur[0]! : null;
}

/** Son N kullanılan (Select tepesinde "Son kullanılanlar" group'u için). */
export function readRecentList(bucket: string, limit: number = 5): RecentValue[] {
  return readBucket(bucket).slice(0, Math.max(0, limit));
}

/** Bucket'ı temizle (örn. "Tercihimi sıfırla" butonu). */
export function clearRecent(bucket: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_PREFIX + bucket);
  } catch {
    /* ignore */
  }
}

/** Bucket sabitleri — typo'yu önler. */
export const RECENT_BUCKETS = {
  txBranchId: "tx-branchId",
  txMainCategory: "tx-mainCategory",
  txCategory: "tx-category",
  txExpensePaymentSource: "tx-expensePaymentSource",
  txCashSettlementParty: "tx-cashSettlementParty",
  txPersonnelId: "tx-personnelId",
  supplierId: "supplier-id",
  warehouseId: "warehouse-id",
} as const;
