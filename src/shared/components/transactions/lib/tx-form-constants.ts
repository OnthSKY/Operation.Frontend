/**
 * AddTransactionModal sabitleri. Saf değer — modal başına değişmez.
 */

/** Modal heading id (aria-labelledby için). */
export const TX_TITLE_ID = "branch-tx-title";

/** Gün sonu ile birlikte hızlı gider satırı için izin verilen ana kategori kodları. */
export const DAY_CLOSE_BUNDLED_OUT_MAINS = new Set<string>(["OUT_OPS"]);

/** Bir gün sonu işleminde eklenebilecek maksimum bundled gider satırı sayısı. */
export const DAY_CLOSE_BUNDLED_EXPENSE_MAX = 3;
