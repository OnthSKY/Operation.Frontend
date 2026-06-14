"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { SupplierInvoiceListItem } from "@/modules/suppliers/api/suppliers-api";

export type PayFormErrors = Partial<{ date: string; amount: string; branch: string }>;

/**
 * Tedarikçi faturasına ödeme kaydetme modal'ı. Saf sunum + draft state'i
 * orchestrator'da tutulur.
 */
type Props = {
  target: SupplierInvoiceListItem | null;
  payDate: string;
  setPayDate: (v: string) => void;
  payAmt: string;
  setPayAmt: (v: string) => void;
  paySrc: string;
  setPaySrc: (v: string) => void;
  payBranchId: string;
  setPayBranchId: (v: string) => void;
  payDesc: string;
  setPayDesc: (v: string) => void;

  payFieldErrors: PayFormErrors;
  setPayFieldErrors: (e: PayFormErrors) => void;

  invoicePaySourceOptions: SelectOption[];
  branchLineSelectOptions: SelectOption[];

  locale: "tr" | "en";
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export function SupplierInvoicePaymentModal(p: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={p.target != null}
      onClose={() => {
        p.setPayFieldErrors({});
        p.onCancel();
      }}
      titleId="pay-title"
      title={t("suppliers.paymentTitle")}
      narrow
      nested
    >
      {p.target ? (
        <div className="flex flex-col gap-3 p-1">
          <p className="text-xs text-zinc-600">{t("suppliers.allocationsHint")}</p>
          {Object.values(p.payFieldErrors).some((v) => v != null && String(v).trim() !== "") ? (
            <div
              className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 shadow-sm"
              role="alert"
            >
              {t("common.formFillRequiredSummary")}
            </div>
          ) : null}
          <p className="text-sm text-zinc-800">
            {p.target.supplierName} · #{p.target.id} · {t("suppliers.openAmount")}:{" "}
            {formatLocaleAmount(p.target.openAmount, p.locale, p.target.currencyCode)}
          </p>
          <DateField
            label={t("suppliers.paymentDate")}
            labelRequired
            value={p.payDate}
            onChange={(e) => p.setPayDate(e.target.value)}
            error={p.payFieldErrors.date}
          />
          <Input
            label={t("suppliers.paymentAmount")}
            labelRequired
            value={p.payAmt}
            onChange={(e) => p.setPayAmt(e.target.value)}
            error={p.payFieldErrors.amount}
          />
          <Select
            name="paySourceType"
            label={t("suppliers.sourceType")}
            options={p.invoicePaySourceOptions}
            value={p.paySrc}
            onChange={(e) => {
              const v = e.target.value;
              p.setPaySrc(v);
              if (v !== "CASH" && v !== "PERSONNEL_HELD_REGISTER_CASH") p.setPayBranchId("");
            }}
            onBlur={() => {}}
            className="min-h-11 sm:min-h-10 sm:text-sm"
          />
          {p.paySrc === "CASH" || p.paySrc === "PERSONNEL_HELD_REGISTER_CASH" ? (
            <Select
              name="payBranchId"
              label={t("suppliers.paymentBranch")}
              labelRequired
              options={p.branchLineSelectOptions}
              value={p.payBranchId}
              onChange={(e) => p.setPayBranchId(e.target.value)}
              onBlur={() => {}}
              error={p.payFieldErrors.branch}
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
          ) : null}
          <Input
            label={t("suppliers.description")}
            value={p.payDesc}
            onChange={(e) => p.setPayDesc(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                p.setPayFieldErrors({});
                p.onCancel();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={p.onSave} disabled={p.saving}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
