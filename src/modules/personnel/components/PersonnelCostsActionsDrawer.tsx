"use client";

import { Button } from "@/shared/ui/Button";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";

/**
 * Costs sekmesi işlem çekmecesi: hesap kapanışı / PDF yazdır / sezon filtresi /
 * (aktif personel) yeni avans / yeni gider butonları. Callback'ler dışarıdan.
 */
export function PersonnelCostsActionsDrawer({
  open,
  onClose,
  printBusy,
  personnelIsDeleted,
  canCreateForPersonnel,
  onOpenAccountClosure,
  onOpenPrint,
  onOpenSeasonFilter,
  onOpenGiveAdvance,
  onOpenAddExpense,
  t,
}: {
  open: boolean;
  onClose: () => void;
  /** Yazdır/kapanış mutation pending. */
  printBusy: boolean;
  personnelIsDeleted: boolean;
  /** Avans/gider yeni-ekle butonları gösterilsin mi (aktif + var olan personel). */
  canCreateForPersonnel: boolean;
  onOpenAccountClosure: () => void;
  onOpenPrint: () => void;
  onOpenSeasonFilter: () => void;
  onOpenGiveAdvance: () => void;
  onOpenAddExpense: () => void;
  t: (k: string) => string;
}) {
  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={t("personnel.detailCostsActions")}
      closeLabel={t("common.close")}
      backdropCloseRequiresConfirm={false}
      rootClassName={OVERLAY_Z_TW.modalNested}
    >
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full"
          disabled={printBusy || personnelIsDeleted}
          onClick={onOpenAccountClosure}
        >
          {t("personnel.accountClosure.openButton")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full"
          disabled={printBusy}
          onClick={onOpenPrint}
        >
          {t("personnel.settlementPrintOpen")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full"
          onClick={onOpenSeasonFilter}
        >
          {t("personnel.detailCostsListSeasonFilterButton")}
        </Button>
        {canCreateForPersonnel ? (
          <>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full"
              onClick={onOpenGiveAdvance}
            >
              {t("personnel.detailCostsGiveAdvance")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full"
              onClick={onOpenAddExpense}
            >
              {t("personnel.detailCostsAddExpense")}
            </Button>
          </>
        ) : null}
      </div>
    </RightDrawer>
  );
}
