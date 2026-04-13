"use client";

import { AddBranchTransactionModal } from "@/modules/branch/components/AddBranchTransactionModal";

export type PersonnelCostsExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  /**
   * Personel maliyetleri: üst filtrede seçili personel (boşsa modalda seçim).
   * Personel listesi: satırdan açıldığında o personelin id’si.
   */
  defaultLinkedPersonnelId?: number;
  /** Personel maliyetleri yıl filtresi; boşsa prop gönderilmez. */
  defaultEffectiveYear?: number;
};

/** Personel maliyetleri «Personel gideri ekle» ile aynı yapılandırma (tek modal). */
export function PersonnelCostsExpenseModal({
  open,
  onClose,
  defaultLinkedPersonnelId,
  defaultEffectiveYear,
}: PersonnelCostsExpenseModalProps) {
  return (
    <AddBranchTransactionModal
      open={open}
      onClose={onClose}
      branchId={null}
      defaultLinkedPersonnelId={defaultLinkedPersonnelId}
      defaultType="OUT"
      defaultEffectiveYear={defaultEffectiveYear}
      personnelDirectExpenseEntry
    />
  );
}
