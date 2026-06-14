export type CreateAdvanceInput = {
  personnelId: number;
  /** CASH için zorunlu; PATRON için opsiyonel (personel şubesi veya şubesiz). */
  branchId?: number;
  /** PERSONNEL_HELD_REGISTER_CASH için zimmetindeki kasa parası kullanılan personel. */
  sourcePersonnelId?: number;
  sourceType?: string;
  amount: number;
  currencyCode?: string | null;
  advanceDate: string;
  effectiveYear: number;
  description?: string | null;
};

export type Advance = {
  id: number;
  personnelId: number;
  branchId: number | null;
  sourceType: string;
  amount: number;
  currencyCode: string;
  advanceDate: string;
  effectiveYear: number;
  description: string | null;
  /** Kasadan düşen şube gider satırına bağlı */
  hasLinkedRegisterExpense?: boolean;
  /** PERSONNEL_HELD_REGISTER_CASH: zimmetindeki kasa parası kullanılan personel. */
  heldRegisterSourcePersonnelId?: number | null;
  heldRegisterSourcePersonnelFullName?: string | null;
  linkedBranchTransactionId?: number | null;
  /** Kaydı oluşturan kullanıcı (audit). */
  createdByUserId?: number | null;
  createdByName?: string | null;
  createdAt?: string | null;
  /** Soft-delete edilmiş kayıt mı (yalnızca sistem yöneticisi includeDeleted=true istediğinde gelir). */
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedByUserId?: number | null;
  deletedByName?: string | null;
};

export type AdvanceListItem = Advance & {
  personnelFullName: string;
  branchName: string | null;
};
