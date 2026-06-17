"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCustomerAccountReceipt,
  fetchCustomerAccountBalance,
  type CustomerAccountReceiptKind,
} from "@/modules/order-account-statement/api/customer-accounts-api";
import { ReceiptKindSelect } from "@/modules/order-account-statement/components/ReceiptKindSelect";
import { uploadBranchDocument } from "@/modules/branch/api/branch-documents-api";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { RichCombobox } from "@/shared/ui/RichCombobox";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  formatAmountInputOnBlur,
  formatLocaleAmount,
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import type { Locale } from "@/i18n/messages";
import { localIsoDate } from "@/shared/lib/local-iso-date";

export type CounterpartyOption = {
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  name: string;
  currencyCode?: string | null;
};

type FixedCounterpartyMode = {
  mode: "fixed";
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  currency?: string;
};

type SelectableCounterpartyMode = {
  mode: "selectable";
  options: CounterpartyOption[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Tek bir counterparty için sabit kullanım veya listeden seçimle çoklu kullanım */
  counterparty: FixedCounterpartyMode | SelectableCounterpartyMode;
  locale: Locale;
  t: (key: string) => string;
  /** Save sonrası ek invalidate/yenileme. (Default invalidate'ler her durumda yapılır.) */
  onSaved?: () => void | Promise<void>;
};

/**
 * Genel tahsilat (NULL linkedOutboundInvoiceId) için tek shared modal.
 *
 * Özellikler:
 *   • fixed / selectable counterparty modu (RichCombobox ile arama)
 *   • Seçili cari'nin AÇIK BAKİYESİ otomatik gösterilir → "Tümü" butonu ile tutar alanına yazılır
 *   • Kind (RichCombobox, shared)
 *   • Branch counterparty için dekont (resim) yükleme — kayıt sonrası branch documents'e yazılır
 *   • Geniş invalidate ([customerAccountBalance], [branchCurrentAccountInvoices])
 */
export function GeneralReceiptModal({ open, onClose, counterparty, locale, t, onSaved }: Props) {
  const qc = useQueryClient();
  const isSelectable = counterparty.mode === "selectable";

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [date, setDate] = useState(localIsoDate());
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<CustomerAccountReceiptKind>("cash");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const optionsByKey = useMemo(() => {
    if (!isSelectable) return new Map<string, CounterpartyOption>();
    const m = new Map<string, CounterpartyOption>();
    for (const o of counterparty.options) {
      m.set(`${o.counterpartyType}:${o.counterpartyId}`, o);
    }
    return m;
  }, [counterparty, isSelectable]);

  const comboboxOptions = useMemo(() => {
    if (!isSelectable) return [];
    return counterparty.options.map((o) => ({
      value: `${o.counterpartyType}:${o.counterpartyId}`,
      title: `${o.counterpartyType === "branch" ? "🏢" : "👤"} ${o.name}`,
      description: o.currencyCode ? `${o.currencyCode}` : undefined,
    }));
  }, [counterparty, isSelectable]);

  const resolvedCounterparty: { type: "branch" | "customer"; id: number; currency: string } | null =
    useMemo(() => {
      if (counterparty.mode === "fixed") {
        return {
          type: counterparty.counterpartyType,
          id: counterparty.counterpartyId,
          currency: (counterparty.currency || "TRY").toUpperCase(),
        };
      }
      const sel = optionsByKey.get(selectedKey);
      if (!sel) return null;
      return {
        type: sel.counterpartyType,
        id: sel.counterpartyId,
        currency: (sel.currencyCode || "TRY").toString().toUpperCase(),
      };
    }, [counterparty, optionsByKey, selectedKey]);

  // Açık bakiye — backend canonical (Şube Cari tab + Cari Hesaplar ile aynı kaynak).
  const balanceQuery = useQuery({
    queryKey: resolvedCounterparty
      ? ["customerAccountBalance", resolvedCounterparty.type, resolvedCounterparty.id]
      : ["customerAccountBalance", "—", 0],
    queryFn: () =>
      resolvedCounterparty
        ? fetchCustomerAccountBalance(resolvedCounterparty.type, resolvedCounterparty.id)
        : Promise.resolve(null),
    enabled: open && resolvedCounterparty != null,
    staleTime: 30_000,
  });

  const openBalance = Math.max(0, Number(balanceQuery.data?.openBalance) || 0);
  const balanceCurrency = balanceQuery.data?.currencyCode ?? resolvedCounterparty?.currency ?? "TRY";

  const reset = () => {
    setSelectedKey("");
    setDate(localIsoDate());
    setAmount("");
    setKind("cash");
    setNotes("");
    setImageFile(null);
  };

  // Modal kapatılırken state sıfırla (yeniden açılışta temiz)
  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const createMut = useMutation({
    mutationFn: addCustomerAccountReceipt,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["customerAccountBalance"] });
      await qc.invalidateQueries({ queryKey: ["branchCurrentAccountInvoices"] });
      await onSaved?.();
      notify.success(t("branch.ledgerReceiptCreated"));
      reset();
      onClose();
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  const submit = async () => {
    if (!resolvedCounterparty) {
      notify.error(t("reports.counterpartySummarySelectRequired"));
      return;
    }
    const parsed = parseLocaleAmount(amount, locale);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error(t("branch.ledgerInvalidAmount"));
      return;
    }
    // Dekont opsiyonel — sadece branch için geçerli, validasyon kayıt öncesi yapılsın
    if (imageFile) {
      if (resolvedCounterparty.type !== "branch") {
        notify.error(t("branch.currentAccountReceiptImageBranchOnly"));
        return;
      }
      const v = await validateImageFileForUpload(imageFile);
      if (!v.ok) {
        notify.error(
          v.reason === "size" ? t("common.imageUploadTooLarge") : t("common.imageUploadNotImage")
        );
        return;
      }
    }

    try {
      await createMut.mutateAsync({
        counterpartyType: resolvedCounterparty.type,
        counterpartyId: resolvedCounterparty.id,
        receiptDate: date,
        amount: parsed,
        currencyCode: resolvedCounterparty.currency,
        receiptKind: kind,
        branchId: resolvedCounterparty.type === "branch" ? resolvedCounterparty.id : null,
        notes: notes.trim() || null,
      });
      // Receipt başarılı — varsa dekontu yükle (best-effort, üst handler success'i çoktan tetiklendi)
      if (imageFile && resolvedCounterparty.type === "branch") {
        try {
          await uploadBranchDocument(resolvedCounterparty.id, {
            file: imageFile,
            kind: "OTHER",
            notes: `title=banka_dekontu · source=current_account_receipt · receiptDate=${date}`,
          });
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      }
    } catch {
      // Hata zaten createMut.onError ile gösterildi
    }
  };

  const applyOpenBalanceToAmount = () => {
    if (openBalance <= 0) return;
    setAmount(formatLocaleAmountInput(openBalance, locale));
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!createMut.isPending) onClose();
      }}
      titleId="general-receipt-modal-title"
      title={t("branch.ledgerAddGeneralReceipt")}
    >
      <div className="space-y-3">
        {isSelectable ? (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700">
              {t("reports.counterpartySummaryColName")}
            </label>
            <RichCombobox
              value={selectedKey}
              onChange={setSelectedKey}
              options={comboboxOptions}
              placeholder={`— ${t("reports.counterpartySummaryColName")} —`}
              searchPlaceholder={t("common.search")}
              emptyText={t("common.noResults")}
            />
          </div>
        ) : null}

        <label className="block text-sm">
          <span className="text-zinc-700">{t("branch.ledgerModalDate")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
          />
        </label>

        {/* Tutar + sağda Açık bakiye chip'i ("Tümü" tıklanır) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm text-zinc-700">
              {t("branch.ledgerModalAmount")} ({resolvedCounterparty?.currency ?? "TRY"})
            </label>
            {resolvedCounterparty && balanceQuery.data ? (
              <button
                type="button"
                onClick={applyOpenBalanceToAmount}
                disabled={openBalance <= 0}
                className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                title={t("branch.ledgerModalApplyOpenBalance")}
              >
                <span className="text-zinc-500">
                  {t("branch.currentAccountOpenTotal")}:
                </span>
                <span className="tabular-nums">
                  {formatLocaleAmount(openBalance, locale, balanceCurrency)}
                </span>
                <span className="ml-1 rounded bg-amber-200/70 px-1 text-[10px] uppercase tracking-wide">
                  {t("branch.ledgerModalApplyAll")}
                </span>
              </button>
            ) : null}
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={(e) => setAmount(formatAmountInputOnBlur(e.target.value, locale))}
            className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm tabular-nums"
            placeholder="0,00"
          />
        </div>

        <ReceiptKindSelect value={kind} onChange={setKind} label={t("branch.ledgerModalKind")} />

        <label className="block text-sm">
          <span className="text-zinc-700">{t("branch.ledgerModalNotes")}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        {/* Dekont (sadece branch counterparty) — modern mobil uyumlu dropzone/preview */}
        {resolvedCounterparty?.type === "branch" ? (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700">
              {t("branch.currentAccountReceiptImage")}
            </label>
            {imageFile ? (
              // Dolu state: thumb + isim/boyut + sil butonu
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                <LocalImageFileThumb
                  file={imageFile}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{imageFile.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {(imageFile.size / 1024).toFixed(0)} KB
                  </p>
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900">
                    <svg
                      aria-hidden
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {t("branch.currentAccountReceiptImageReplace") || "Değiştir"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif"
                      className="hidden"
                      onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  aria-label={t("common.remove") || "Sil"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-rose-600 transition hover:bg-rose-50 hover:border-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  <svg
                    aria-hidden
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            ) : (
              // Boş state: dashed dropzone, mobil tap-friendly
              <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 px-3 py-4 text-center transition hover:border-violet-400 hover:bg-violet-50/30 focus-within:border-violet-500 focus-within:bg-violet-50/40">
                <svg
                  aria-hidden
                  className="h-6 w-6 text-zinc-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-sm font-medium text-zinc-700">
                  {t("branch.currentAccountReceiptImageUploadCta") || "Dosya seç veya kameradan çek"}
                </span>
                <span className="text-[11px] text-zinc-500">JPG · PNG · WEBP · HEIC</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px]"
            disabled={createMut.isPending}
            onClick={onClose}
          >
            {t("branch.ledgerModalCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px]"
            disabled={createMut.isPending || (isSelectable && !selectedKey)}
            onClick={() => void submit()}
          >
            {createMut.isPending ? t("common.loading") : t("branch.ledgerModalSave")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
