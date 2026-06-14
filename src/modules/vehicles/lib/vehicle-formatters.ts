import type { VehicleExpense } from "@/types/vehicle";
import type { VehicleInsuranceBadge } from "@/types/vehicle";

/** Gruplandırılmış (binlik ayırıcılı) tam sayı input formatlayıcı. */
export function formatGroupedIntegerInput(raw: string, locale: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat(
    locale === "tr" ? "tr-TR" : "en-US",
  ).format(Number(digits));
}

/** Gruplandırılmış input'tan integer parse; geçersiz/boş → null. */
export function parseGroupedIntegerInput(raw: string): number | null {
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Şube kayıtlı bir araç giderinin ödeme kaynağına göre tek satır açıklama:
 *  - PATRON kaynağı + kart/nakit ayrımı → "Patron ödedi · Kart/Nakit"
 *  - REGISTER → "Şube kasasından ödendi"
 *  - Kayıtlı değilse `null`.
 */
export function vehicleExpenseBranchPostingDetail(
  x: VehicleExpense,
  t: (key: string) => string,
): string | null {
  if (x.postedBranchId == null || x.postedBranchId <= 0) return null;
  const src = (x.postedExpensePaymentSource ?? "REGISTER").toUpperCase();
  if (src === "PATRON") {
    const card = x.postedRegisterCardAmount ?? 0;
    const cash = x.postedRegisterCashAmount ?? 0;
    const method =
      card > 0 && cash <= 0
        ? t("vehicles.expensePayCard")
        : t("vehicles.expensePayCash");
    return `${t("vehicles.expensePaidByPatron")} · ${method}`;
  }
  return t("vehicles.expensePaidFromRegisterDrawer");
}

/** Sigorta durum rozetinin tailwind sınıfları. */
export function badgeClasses(b: VehicleInsuranceBadge): string {
  switch (b) {
    case "EXPIRED":
      return "bg-red-50 text-red-800 ring-red-200";
    case "SOON":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "OK":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    default:
      return "bg-zinc-100 text-zinc-600 ring-zinc-200";
  }
}
