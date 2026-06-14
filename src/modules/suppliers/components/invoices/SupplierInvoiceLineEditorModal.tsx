"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import {
  formatAmountInputOnBlur,
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";

/** UsersScreen ile aynı pattern: draft kullanıcı tipi prop olarak gelir. */
export type InvoiceLineDraft = {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  lineAmount: string;
  description: string;
  receiveTarget: "none" | "warehouse" | "branch";
  receiveWarehouseId: string;
  receiveBranchId: string;
};

export type InvLineEditFormErrors = Partial<{
  product: string;
  quantity: string;
  lineAmount: string;
  receiveBranch: string;
  receiveWarehouse: string;
}>;

/**
 * Nested fatura kalem editörü modal'ı. Saf sunum + draft callback'leri.
 *
 * Yardımcı fonksiyonlar (autoFill, parseDec) dışarıdan inject — orchestrator'da
 * tek tanımlı kalır (DRY).
 */
type Props = {
  draft: InvoiceLineDraft | null;
  setDraft: React.Dispatch<React.SetStateAction<InvoiceLineDraft | null>>;
  errors: InvLineEditFormErrors;
  /** Açık olup olmadığını orchestrator hesaplar (key + draft kontrolü). */
  open: boolean;
  title: string;
  onClose: () => void;
  onApply: () => void;

  productLineSelectOptions: SelectOption[];
  warehouseLineSelectOptions: SelectOption[];
  branchLineSelectOptions: SelectOption[];

  invCur: string;
  locale: "tr" | "en";
  /** Miktar/birim fiyat blur'unda satır tutarını otomatik doldurur. */
  autoFillLineAmount: (d: InvoiceLineDraft, locale: "tr" | "en") => InvoiceLineDraft;
  /** Vergi etiketi için yardımcı. */
  parseDec: (s: string) => number | null;
};

export function SupplierInvoiceLineEditorModal(p: Props) {
  const { t } = useI18n();
  const draft = p.draft;
  return (
    <Modal
      nested
      open={p.open}
      onClose={p.onClose}
      titleId="inv-line-edit-title"
      title={p.title}
      narrow
      closeButtonLabel={t("common.close")}
      backdropCloseRequiresConfirm={false}
      className="!max-w-[min(100vw-1rem,36rem)] sm:!max-w-xl"
    >
      {draft ? (
        <div className="flex max-h-[min(92dvh,52rem)] min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-0 sm:px-5 sm:pb-3">
            <div className="flex flex-col gap-3 pt-1">
              {Object.keys(p.errors).length > 0 ? (
                <div
                  className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 shadow-sm"
                  role="alert"
                >
                  {t("common.formFillRequiredSummary")}
                </div>
              ) : null}
              <Select
                name="invLineEditProduct"
                label={t("suppliers.product")}
                options={p.productLineSelectOptions}
                value={draft.productId}
                onChange={(e) =>
                  p.setDraft((d) => (d ? { ...d, productId: e.target.value } : d))
                }
                onBlur={() => {}}
                error={
                  draft.receiveTarget === "warehouse" ? p.errors.product : undefined
                }
                className="min-h-12 text-base sm:min-h-10 sm:text-sm"
              />
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  label={t("suppliers.quantity")}
                  inputMode="decimal"
                  value={draft.quantity}
                  onChange={(e) =>
                    p.setDraft((d) => (d ? { ...d, quantity: e.target.value } : d))
                  }
                  onBlur={() =>
                    p.setDraft((d) => (d ? p.autoFillLineAmount(d, p.locale) : d))
                  }
                  error={
                    draft.receiveTarget === "warehouse" ? p.errors.quantity : undefined
                  }
                />
                <Input
                  label={t("suppliers.unitPrice")}
                  inputMode="decimal"
                  value={draft.unitPrice}
                  onChange={(e) =>
                    p.setDraft((d) => (d ? { ...d, unitPrice: e.target.value } : d))
                  }
                  onBlur={() =>
                    p.setDraft((d) => (d ? p.autoFillLineAmount(d, p.locale) : d))
                  }
                />
                <Input
                  label={t("suppliers.vatRate")}
                  inputMode="decimal"
                  placeholder="0–100"
                  value={draft.vatRate}
                  onChange={(e) =>
                    p.setDraft((d) => (d ? { ...d, vatRate: e.target.value } : d))
                  }
                />
              </div>
              <div>
                <Input
                  label={t("suppliers.lineAmount")}
                  labelRequired
                  inputMode="decimal"
                  value={draft.lineAmount}
                  onChange={(e) =>
                    p.setDraft((d) => (d ? { ...d, lineAmount: e.target.value } : d))
                  }
                  onBlur={() =>
                    p.setDraft((d) =>
                      d
                        ? {
                            ...d,
                            lineAmount: formatAmountInputOnBlur(d.lineAmount, p.locale),
                          }
                        : d
                    )
                  }
                  error={p.errors.lineAmount}
                />
                {(() => {
                  const amt = parseLocaleAmount(draft.lineAmount, p.locale);
                  const vat = p.parseDec(draft.vatRate);
                  if (!Number.isFinite(amt) || amt <= 0) return null;
                  const vatPct =
                    Number.isFinite(vat) && vat! >= 0 && vat! <= 100 ? vat! : 0;
                  const incl = amt * (1 + vatPct / 100);
                  return (
                    <p className="mt-1 text-xs text-zinc-500">
                      {t("suppliers.vatIncludedTotal")}:{" "}
                      <span className="font-medium tabular-nums text-zinc-700">
                        {formatLocaleAmount(incl, p.locale, p.invCur.trim() || "TRY")}
                      </span>
                    </p>
                  );
                })()}
              </div>
              <Input
                label={t("suppliers.lineDescription")}
                value={draft.description}
                onChange={(e) =>
                  p.setDraft((d) => (d ? { ...d, description: e.target.value } : d))
                }
              />
              <div
                className={cn(
                  "rounded-xl border p-3 sm:p-4",
                  p.errors.receiveBranch || p.errors.receiveWarehouse
                    ? "border-red-400 bg-zinc-50/80"
                    : "border-zinc-200/90 bg-zinc-50/80"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("suppliers.lineReceiveTarget")}
                </p>
                <p className="mt-1 text-xs text-zinc-600">{t("suppliers.movementHint")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["none", t("suppliers.lineReceiveNone")] as const,
                      ["warehouse", t("suppliers.lineReceiveWarehouse")] as const,
                      ["branch", t("suppliers.lineReceiveBranch")] as const,
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        p.setDraft((d) =>
                          d
                            ? {
                                ...d,
                                receiveTarget: mode,
                                ...(mode !== "warehouse" ? { receiveWarehouseId: "" } : {}),
                                ...(mode !== "branch" ? { receiveBranchId: "" } : {}),
                              }
                            : d
                        )
                      }
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs font-semibold transition sm:text-sm",
                        draft.receiveTarget === mode
                          ? "border-violet-500 bg-violet-50 text-violet-900"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {draft.receiveTarget === "warehouse" ? (
                  <div className="mt-3">
                    <Select
                      name="invLineEditWh"
                      label={t("suppliers.receiveWarehouseLabel")}
                      labelRequired
                      options={p.warehouseLineSelectOptions}
                      value={draft.receiveWarehouseId}
                      onChange={(e) =>
                        p.setDraft((d) =>
                          d ? { ...d, receiveWarehouseId: e.target.value } : d
                        )
                      }
                      onBlur={() => {}}
                      error={p.errors.receiveWarehouse}
                      className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                    />
                  </div>
                ) : null}
                {draft.receiveTarget === "branch" ? (
                  <div className="mt-3">
                    <Select
                      name="invLineEditBranch"
                      label={t("suppliers.receiveBranchLabel")}
                      labelRequired
                      options={p.branchLineSelectOptions}
                      value={draft.receiveBranchId}
                      onChange={(e) =>
                        p.setDraft((d) =>
                          d ? { ...d, receiveBranchId: e.target.value } : d
                        )
                      }
                      onBlur={() => {}}
                      error={p.errors.receiveBranch}
                      className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white px-3 py-3 sm:flex-row sm:justify-end sm:px-5">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              onClick={p.onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              onClick={p.onApply}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
