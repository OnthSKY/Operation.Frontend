"use client";

import { useI18n } from "@/i18n/context";
import { BranchExpenseRoutingCallout } from "@/modules/branch/components/BranchExpenseRoutingCallout";

/**
 * Modal form gövdesindeki tüm "metin uyarıları" tek dosyada toplandı.
 * Daha önce ayrı component'lerdi (TxFormIntro, TxStoryCallout, TxCalloutHints) —
 * her biri 5-10 satır JSX'i tek kullanım için ayrı dosya açıyor, "import noise" oluşturuyordu.
 *
 * Konsolide ama hâlâ parça parça named export — ilgili yerde sadece o callout
 * import edilir, tüm dosya yüklenmez.
 */

/** Modal form gövdesinin tepesinde: hint paragrafı + (OUT seçiliyse) routing callout. */
export function TxFormIntro({
  txType,
  personnelExpenseFlow,
}: {
  txType: string;
  personnelExpenseFlow: boolean;
}) {
  const { t } = useI18n();
  const isOut = txType.trim().toUpperCase() === "OUT";
  return (
    <>
      <p className="text-[11px] leading-snug text-zinc-500 sm:text-xs">
        {t("branch.txModalHintDetail")}
      </p>
      {isOut ? (
        <BranchExpenseRoutingCallout
          variant={personnelExpenseFlow ? "personnel-only" : "full"}
        />
      ) : null}
    </>
  );
}

/** IN/OUT için kısa bağlam callout'u (yeşil veya kırmızı). */
export function TxStoryCallout({ txType }: { txType: string }) {
  const { t } = useI18n();
  if (txType.toUpperCase() === "IN") {
    return (
      <p className="rounded-md border border-emerald-100 bg-emerald-50/60 px-2.5 py-1.5 text-[11px] leading-snug text-balance text-emerald-950 break-words lg:col-span-2">
        {t("branch.txStoryIncomeCallout")}
      </p>
    );
  }
  return (
    <p className="rounded-md border border-red-100 bg-red-50/60 px-2.5 py-1.5 text-[11px] leading-snug text-balance text-red-950 break-words lg:col-span-2">
      {t("branch.txStoryExpenseCallout")}
    </p>
  );
}

/** Patron nakit girişi (amber) + P&L dışı not (sky) uyarıları. */
export function TxCalloutHints({
  patronCashActive,
  nonPnlMemoActive,
}: {
  patronCashActive: boolean;
  nonPnlMemoActive: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      {patronCashActive ? (
        <p className="rounded-md border border-amber-100 bg-amber-50/60 px-2.5 py-1.5 text-[11px] leading-snug text-balance text-amber-950 sm:col-span-2">
          {t("branch.txPatronCashIncomeHint")}
        </p>
      ) : null}
      {nonPnlMemoActive ? (
        <p className="rounded-md border border-sky-100 bg-sky-50/70 px-2.5 py-1.5 text-[11px] leading-snug text-balance text-sky-950 sm:col-span-2">
          {t("branch.txNonPnlModalHint")}
        </p>
      ) : null}
    </>
  );
}
