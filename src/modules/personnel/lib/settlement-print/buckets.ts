/**
 * Ödeme-kaynağı (bucket) alanı: paletten kovaya eşleme, etiket/renk ve gider-mi/transfer-mi
 * sınıflandırması. Yeni bir ödeme kaynağı veya renk eklemek bu dosyadan yapılır.
 */
import {
  isNonPnlMemoClassificationMain,
  isPatronDebtRepayClassificationMain,
  isPersonnelPocketRepayClassificationMain,
  isPocketClaimTransferClassificationMain,
} from "@/modules/branch/lib/branch-transaction-options";
import type { BranchTransaction } from "@/types/branch-transaction";

/**
 * Disiplinli story paleti — anlam başına tek hue, tüm belgede tekrar kullanılır
 * (rainbow değil). Bölüm başlıkları ve chip'ler bu sete bağlanır.
 */
export const PALETTE = {
  income: "#0f766e", // teal — gelir / nakit / kasa / toplam (kahraman)
  expense: "#be123c", // rose — gider / çıkış
  personnel: "#7c3aed", // violet — personel ekseni (avans / maaş / cep / zimmet)
  goods: "#b45309", // amber — stok / patron
  card: "#2563eb", // blue — kart / POS / banka
  neutral: "#64748b", // slate — diğer / atanmamış / nötr
} as const;

export type SrcBucket =
  | "REGISTER"
  | "PATRON"
  | "PERSONNEL_POCKET"
  | "PERSONNEL_HELD_REGISTER_CASH"
  | "BANK";

export const SRC_ORDER: SrcBucket[] = [
  "REGISTER",
  "PATRON",
  "PERSONNEL_POCKET",
  "PERSONNEL_HELD_REGISTER_CASH",
  "BANK",
];

/** OUT ödeme kaynağı kodu → kova. Boş/diğer (memo, transfer, ödenmemiş fatura) = null. */
export function srcBucketOfExpense(code: string | null | undefined): SrcBucket | null {
  const u = String(code ?? "").trim().toUpperCase();
  if (
    u === "REGISTER" ||
    u === "PATRON" ||
    u === "PERSONNEL_POCKET" ||
    u === "PERSONNEL_HELD_REGISTER_CASH"
  )
    return u;
  return null;
}

/** Avans sourceType → kova. */
export function srcBucketOfAdvance(sourceType: string | null | undefined): SrcBucket {
  const u = String(sourceType ?? "").trim().toUpperCase();
  if (u === "PATRON" || u === "PATRON_BRANCH") return "PATRON";
  if (u === "BANK") return "BANK";
  if (u === "PERSONNEL_HELD_REGISTER_CASH") return "PERSONNEL_HELD_REGISTER_CASH";
  if (u === "PERSONNEL_POCKET") return "PERSONNEL_POCKET";
  return "REGISTER";
}

export function srcBucketLabel(b: SrcBucket, t: (k: string) => string): string {
  switch (b) {
    case "REGISTER":
      return t("branch.expensePayRegister");
    case "PATRON":
      return t("branch.expensePayPatron");
    case "PERSONNEL_POCKET":
      return t("branch.expensePayPersonnelPocket");
    case "PERSONNEL_HELD_REGISTER_CASH":
      return t("branch.expensePayPersonnelHeldRegisterCash");
    case "BANK":
      return t("personnel.advanceSourceAbbrBank");
  }
}

export function srcBucketColor(b: SrcBucket): string {
  switch (b) {
    case "REGISTER":
      return PALETTE.income;
    case "PATRON":
      return PALETTE.goods;
    case "PERSONNEL_POCKET":
    case "PERSONNEL_HELD_REGISTER_CASH":
      return PALETTE.personnel;
    case "BANK":
      return PALETTE.card;
  }
}

/**
 * Bir OUT satırı gerçek işletme gideri DEĞİL mi — kasa transferi/uzlaşması mı?
 * Patrona devir/borç ödeme (patrona bırakma), personel cep/zimmet alacağı devirleri ve
 * P&L-dışı memo satırları gider/kâr toplamlarına girmemeli (yalnızca para yer değiştirir).
 */
export function isNonExpenseOutRow(r: BranchTransaction): boolean {
  if (r.excludedFromProfitAndLoss === true) return true;
  const mc = r.mainCategory;
  return (
    isNonPnlMemoClassificationMain(mc) ||
    isPatronDebtRepayClassificationMain(mc) ||
    isPersonnelPocketRepayClassificationMain(mc) ||
    isPocketClaimTransferClassificationMain(mc)
  );
}

/** registerTx OUT satırı bir kişiye (avans/maaş/personel) bağlı mı — şube giderinden hariç tutmak için. */
export function isPersonnelLinkedTx(r: BranchTransaction): boolean {
  return (
    (r.linkedAdvanceId ?? 0) > 0 ||
    (r.linkedSalaryPaymentId ?? 0) > 0 ||
    (r.linkedPersonnelId ?? 0) > 0 ||
    (r.linkedAdvancePersonnelId ?? 0) > 0 ||
    (r.linkedSalaryPersonnelId ?? 0) > 0
  );
}
