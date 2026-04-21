"use client";

import { settleBranchInvoiceExpense } from "@/modules/branch/api/branch-transactions-api";
import { buildExpensePaymentSelectOptions } from "@/modules/branch/lib/branch-transaction-options";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";
import { ApiError } from "@/lib/api/base-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { BRANCH_API_ERROR_TOURISM_SEASON_CLOSED_FOR_REGISTER } from "@/modules/branch/lib/branch-api-error-codes";
import { branchTourismSeasonDeepLink } from "@/modules/branch/lib/branch-tourism-season-nav";
import {
  resolveLocalizedApiError,
  userCanManageTourismSeasonClosedPolicy,
} from "@/shared/lib/resolve-localized-api-error";
import { useI18n } from "@/i18n/context";
import { notify } from "@/shared/lib/notify";
import { notifyErrorWithAction } from "@/shared/lib/notify-error-with-action";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  row: BranchTransaction | null;
  branchStaff: Personnel[];
};

export function InvoiceSettleModal({ open, onClose, row, branchStaff }: Props) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const canManageTourismPolicy = userCanManageTourismSeasonClosedPolicy(user?.role);
  const router = useRouter();
  const qc = useQueryClient();
  const [expensePaymentSource, setExpensePaymentSource] = useState("");
  const [expensePocketPersonnelId, setExpensePocketPersonnelId] = useState("");
  const [busy, setBusy] = useState(false);

  const orgMode = row?.branchId == null || row.branchId <= 0;
  const branchId = row?.branchId != null && row.branchId > 0 ? row.branchId : null;

  useEffect(() => {
    if (!open) {
      setExpensePaymentSource("");
      setExpensePocketPersonnelId("");
      return;
    }
    setExpensePaymentSource("");
    setExpensePocketPersonnelId("");
  }, [open, row?.id]);

  const payOptions: SelectOption[] = useMemo(() => {
    if (!row) return [{ value: "", label: t("branch.txSelectPlaceholder") }];
    return buildExpensePaymentSelectOptions({
      orgMode,
      mainCategory: String(row.mainCategory ?? ""),
      category: String(row.category ?? ""),
      isNonPnlMemoMain: false,
      isPatronDebtRepayMain: false,
      isPocketRepayMain: false,
      t,
    });
  }, [row, orgMode, t]);

  const staffOptions: SelectOption[] = useMemo(() => {
    const loc = locale === "tr" ? "tr" : "en";
    const list = branchStaff.filter(
      (p) => !p.isDeleted && (branchId == null || p.branchId === branchId)
    );
    return [
      { value: "", label: t("branch.cashSettlementResponsiblePick") },
      ...[...list]
        .sort((a, b) => a.fullName.localeCompare(b.fullName, loc))
        .map((p) => ({
          value: String(p.id),
          label: `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`,
        })),
    ];
  }, [branchStaff, branchId, locale, t]);

  const payU = expensePaymentSource.trim().toUpperCase();

  const submit = useCallback(async () => {
    if (!row) return;
    const src = expensePaymentSource.trim().toUpperCase();
    if (!src) {
      notify.error(t("branch.txNotifyIncomplete"));
      return;
    }
    if (src === "PERSONNEL_POCKET") {
      const n = parseInt(expensePocketPersonnelId.trim(), 10);
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("branch.txExpensePocketPersonnelRequired"));
        return;
      }
    }
    setBusy(true);
    try {
      await settleBranchInvoiceExpense(row.id, {
        expensePaymentSource: src,
        expensePocketPersonnelId:
          src === "PERSONNEL_POCKET"
            ? parseInt(expensePocketPersonnelId.trim(), 10)
            : undefined,
      });
      await qc.invalidateQueries({ queryKey: branchKeys.all });
      notify.success(t("toast.branchInvoiceSettled"));
      onClose();
    } catch (e) {
      const tourismHref = branchTourismSeasonDeepLink(branchId, false);
      if (
        e instanceof ApiError &&
        e.errorCode === BRANCH_API_ERROR_TOURISM_SEASON_CLOSED_FOR_REGISTER &&
        tourismHref
      ) {
        notifyErrorWithAction({
          message: resolveLocalizedApiError(e, t, {
            canManageTourismSeasonClosedPolicy: canManageTourismPolicy,
          }),
          actionLabel: t("branch.tourismSeasonClosedOpenTab"),
          autoCloseMs: 10_000,
          onAction: () => {
            onClose();
            router.push(tourismHref);
          },
        });
      } else {
        notify.error(toErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }, [
    row,
    expensePaymentSource,
    expensePocketPersonnelId,
    qc,
    onClose,
    router,
    branchId,
    t,
    canManageTourismPolicy,
  ]);

  if (!row) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="invoice-settle-title"
      title={t("branch.invoiceSettleTitle")}
      description={t("branch.invoiceSettleHint")}
      closeButtonLabel={t("common.close")}
    >
      <div className="mt-3 space-y-3">
        <Select
          label={t("branch.expensePaymentLabel")}
          labelRequired
          options={payOptions}
          name="invoice-settle-pay"
          value={expensePaymentSource}
          onChange={(e) => setExpensePaymentSource(e.target.value)}
          onBlur={() => {}}
        />
        {payU === "PERSONNEL_POCKET" ? (
          <Select
            label={t("branch.expensePocketPersonLabel")}
            labelRequired
            options={staffOptions}
            name="invoice-settle-pocket"
            value={expensePocketPersonnelId}
            onChange={(e) => setExpensePocketPersonnelId(e.target.value)}
            onBlur={() => {}}
          />
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {t("common.close")}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {t("branch.invoiceSettleSubmit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
