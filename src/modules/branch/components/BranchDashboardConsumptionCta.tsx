"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { canConsumeBranchStock } from "@/lib/auth/permissions";
import { Button } from "@/shared/ui/Button";
import { ConsumptionQuickEntryModal } from "./ConsumptionQuickEntryModal";

type Props = {
  branchId: number;
  className?: string;
};

/**
 * Branch dashboard üstündeki "+ Hızlı stok düşümü" kısayolu. Şube çalışanı stok kullanımını
 * tab'lara dalmadan doğrudan modal üzerinden girer. Yetkisizse render edilmez.
 */
export function BranchDashboardConsumptionCta({ branchId, className }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!canConsumeBranchStock(user)) return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={className}
        onClick={() => setOpen(true)}
      >
        {t("branchStockConsumption.actionQuickConsume")}
      </Button>
      <ConsumptionQuickEntryModal
        open={open}
        onClose={() => setOpen(false)}
        branchId={branchId}
        mode="consume"
      />
    </>
  );
}
