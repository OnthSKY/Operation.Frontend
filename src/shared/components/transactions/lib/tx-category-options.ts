import {
  TX_MAIN_OUT,
  orderBranchExpenseMainOptions,
  txMainOptions,
  txSubOptions,
  txSubOptionsForRegisterExpenseModal,
} from "@/modules/branch/lib/branch-transaction-options";
import { UI_POCKET_CLAIM_TRANSFER_ENABLED } from "@/modules/branch/lib/product-ui-flags";
import type { SelectOption } from "@/shared/ui/Select";
import { DAY_CLOSE_BUNDLED_OUT_MAINS } from "./tx-form-constants";

/**
 * Ana kategori (TX_MAIN_OUT / TX_MAIN_IN) select option listesi:
 *  - personnelExpenseFlow + OUT: yalnız OUT_PERSONNEL.
 *  - orgMode: cep/patron/non-pnl umbrellaları çıkarılır.
 *  - OUT'larda `orderBranchExpenseMainOptions` ile sıralama.
 *  - POCKET_CLAIM_TRANSFER flag kapalı ise umbrella gizlenir.
 */
export function buildTxMainOptions(input: {
  txType: string;
  t: (key: string) => string;
  orgMode: boolean;
  personnelExpenseFlow: boolean;
}): SelectOption[] {
  const { txType, t, orgMode, personnelExpenseFlow } = input;
  const base = txMainOptions(txType, t);
  const ty = txType.trim().toUpperCase();
  let opts: SelectOption[];
  if (personnelExpenseFlow && ty === "OUT") {
    opts = base.filter((o) => o.value === "OUT_PERSONNEL");
  } else if (orgMode) {
    const filtered = base.filter(
      (o) =>
        o.value !== "OUT_PERSONNEL_POCKET_REPAY" &&
        o.value !== "OUT_PATRON_DEBT_REPAY" &&
        o.value !== "OUT_NON_PNL"
    );
    opts = ty === "OUT" ? orderBranchExpenseMainOptions(filtered) : filtered;
  } else if (ty === "OUT") {
    opts = orderBranchExpenseMainOptions(base);
  } else {
    opts = base;
  }
  if (ty === "OUT" && !UI_POCKET_CLAIM_TRANSFER_ENABLED) {
    opts = opts.filter((o) => o.value !== "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER");
  }
  return opts;
}

/** Alt kategori (sub) seçenekleri — OUT'ta tedarikçi-uyumlu liste. */
export function buildTxSubOptions(input: {
  txType: string;
  mainCategoryWatch: string | null | undefined;
  t: (key: string) => string;
}): SelectOption[] {
  const { txType, mainCategoryWatch, t } = input;
  const ty = txType.trim().toUpperCase();
  if (ty === "OUT") {
    return txSubOptionsForRegisterExpenseModal(String(mainCategoryWatch ?? ""), t);
  }
  return txSubOptions(String(mainCategoryWatch ?? ""), t);
}

/** Gün sonu ile birlikte bundled gider için ana kategori seçenekleri (yalnız izinli umbrella). */
export function buildDayCloseBundledMainOptions(
  t: (key: string) => string
): SelectOption[] {
  const empty = { value: "", label: t("branch.txSelectPlaceholder") };
  const rows = TX_MAIN_OUT.filter((x) => DAY_CLOSE_BUNDLED_OUT_MAINS.has(x.value));
  return [empty, ...rows.map((x) => ({ value: x.value, label: t(x.labelKey) }))];
}
