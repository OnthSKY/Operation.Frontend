"use client";

import { PersonnelHeldRegisterPersonLink } from "@/modules/personnel/components/PersonnelHeldRegisterPersonLink";
import type { Advance } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";

type Common = {
  personnelById: Map<number, Personnel>;
  dash: string;
  t: (k: string) => string;
};

/**
 * Avans satırı zimmetli kasa kaynağıysa (PERSONNEL_HELD_REGISTER_CASH /
 * PERSONNEL_POCKET), parayı zimmetinde tutan personeli rozet biçiminde gösterir.
 */
export function AdvanceHeldRegisterSourceMeta({
  advance,
  personnelById,
  dash,
  t,
}: Common & { advance: Advance }) {
  const advU = advance.sourceType?.toUpperCase();
  if (advU !== "PERSONNEL_HELD_REGISTER_CASH" && advU !== "PERSONNEL_POCKET")
    return null;
  const pid = advance.heldRegisterSourcePersonnelId;
  if (pid == null || pid <= 0) return null;
  return (
    <p className="mt-1 text-xs text-zinc-600">
      <span className="font-medium text-zinc-500">
        {t("personnel.detailCostsHeldRegisterSource")}:{" "}
      </span>
      <PersonnelHeldRegisterPersonLink
        personnelId={pid}
        fullName={advance.heldRegisterSourcePersonnelFullName}
        personnelById={personnelById}
        dash={dash}
        openCashPhysicalTab
      />
    </p>
  );
}

/**
 * Gider satırı zimmetli kasa kaynağıyla ödenmişse zimmet sahibi personeli gösterir.
 */
export function ExpenseHeldRegisterSourceMeta({
  tx,
  personnelById,
  dash,
  t,
}: Common & { tx: BranchTransaction }) {
  if (
    tx.expensePaymentSource?.toUpperCase() !== "PERSONNEL_HELD_REGISTER_CASH"
  ) {
    return null;
  }
  const pid = tx.expensePocketPersonnelId;
  if (pid == null || pid <= 0) return null;
  return (
    <p className="text-xs text-zinc-700">
      <span className="font-medium text-zinc-500">
        {t("personnel.detailCostsHeldRegisterSource")}:{" "}
      </span>
      <PersonnelHeldRegisterPersonLink
        personnelId={pid}
        fullName={null}
        personnelById={personnelById}
        dash={dash}
        openCashPhysicalTab
      />
    </p>
  );
}
