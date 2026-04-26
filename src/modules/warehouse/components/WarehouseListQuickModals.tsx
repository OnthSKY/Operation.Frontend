"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  WarehouseTransferFreightFields,
  type WarehouseFreightPaymentSource,
} from "@/modules/warehouse/components/WarehouseTransferFreightFields";
import { WarehouseTransferFreightValuationBar } from "@/modules/warehouse/components/WarehouseTransferFreightValuationBar";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import {
  useRegisterWarehouseMovement,
  useTransferWarehouseToBranch,
  useWarehousePeopleOptions,
  useWarehouseStock,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { IMAGE_FILE_INPUT_ACCEPT } from "@/shared/lib/image-upload-limits";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { apiUserFacingMessage } from "@/shared/lib/api-user-facing-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type { WarehouseProductStockRow } from "@/types/product";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

function newDraftLineKey() {
  return globalThis.crypto?.randomUUID?.() ?? `ln-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type LineDraft = { key: string; productId: string; qty: string };

type ResolvedReceiptLine = {
  key: string;
  groupId: number;
  groupLabel: string;
  skuName: string;
  quantity: number;
  unit: string | null;
};

const DEPO_TITLE_ID = "wh-list-depo-in-title";
const DEPO_RECEIPT_SUMMARY_ID = "wh-list-depo-receipt-summary";
const TRANSFER_TITLE_ID = "wh-list-transfer-title";

function productLabel(r: WarehouseProductStockRow) {
  const u = r.unit?.trim();
  const base = u ? `${r.productName} (${u})` : r.productName;
  const p = r.parentProductName?.trim();
  const c = r.categoryName?.trim();
  const sameAsParent =
    p &&
    p.localeCompare(r.productName.trim(), undefined, { sensitivity: "accent" }) === 0;
  const withParent = p && !sameAsParent ? `${p} › ${base}` : base;
  return c ? `${withParent} · ${c}` : withParent;
}

type WhRef = { id: number; name: string } | null;

function resolveDepoInReceiptLines(
  lines: LineDraft[],
  stockRows: WarehouseProductStockRow[]
): ResolvedReceiptLine[] {
  const out: ResolvedReceiptLine[] = [];
  for (const line of lines) {
    const pid = Number(line.productId);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    const n = Number(line.qty.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) continue;
    const row = stockRows.find((r) => r.productId === pid);
    if (!row) continue;
    const hasParent = row.parentProductId != null && row.parentProductId > 0;
    const groupId = hasParent ? row.parentProductId! : row.productId;
    const parentNm = row.parentProductName?.trim() ?? "";
    const groupLabel =
      hasParent && parentNm.length > 0 ? parentNm : row.productName.trim();
    out.push({
      key: line.key,
      groupId,
      groupLabel,
      skuName: row.productName.trim(),
      quantity: n,
      unit: row.unit?.trim() ? row.unit.trim() : null,
    });
  }
  return out;
}

export function WarehouseListDepoInModal({
  target,
  onClose,
}: {
  target: WhRef;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const open = target != null;
  const warehouseId = target?.id ?? null;
  const whName = target?.name?.trim() ?? "";

  const { data: stockRows = [], isPending: stockLoading } = useWarehouseStock(
    open && warehouseId != null && warehouseId > 0 ? warehouseId : null
  );
  const { data: peopleRaw = [], isPending: peopleLoading } = useWarehousePeopleOptions(open);
  const movement = useRegisterWarehouseMovement();

  const [movementDate, setMovementDate] = useState(() => localIsoDate());
  const [lines, setLines] = useState<LineDraft[]>(() => [{ key: newDraftLineKey(), productId: "", qty: "1" }]);
  const [inCheckedBy, setInCheckedBy] = useState("");
  const [inApprovedBy, setInApprovedBy] = useState("");
  const [inMovementNote, setInMovementNote] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  const addDepoLine = useCallback(() => {
    setLines((ls) => [...ls, { key: newDraftLineKey(), productId: "", qty: "1" }]);
  }, []);

  const removeDepoLine = useCallback((key: string) => {
    setLines((ls) => (ls.length <= 1 ? ls : ls.filter((l) => l.key !== key)));
  }, []);

  const updateDepoLine = useCallback(
    (key: string, patch: Partial<Pick<LineDraft, "productId" | "qty">>) => {
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    },
    []
  );

  const personnelOptions = useMemo(
    () =>
      peopleRaw
        .filter((o) => o.personnelId != null && o.personnelId > 0)
        .map((o) => ({ value: String(o.personnelId), label: o.displayName })),
    [peopleRaw]
  );
  const personnelSelectOptions = useMemo(
    () => [{ value: "", label: t("warehouse.personnelPickPlaceholder") }, ...personnelOptions],
    [personnelOptions, t]
  );
  const productOptions = useMemo(
    () => [
      { value: "", label: t("warehouse.listQuickPickProduct") },
      ...stockRows.map((r) => ({ value: String(r.productId), label: productLabel(r) })),
    ],
    [stockRows, t]
  );

  const resolvedReceiptLines = useMemo(
    () => resolveDepoInReceiptLines(lines, stockRows),
    [lines, stockRows]
  );

  const receiptParentGroups = useMemo(() => {
    const map = new Map<number, { groupLabel: string; rows: ResolvedReceiptLine[] }>();
    for (const row of resolvedReceiptLines) {
      const cur = map.get(row.groupId) ?? { groupLabel: row.groupLabel, rows: [] };
      cur.rows.push(row);
      cur.groupLabel = row.groupLabel;
      map.set(row.groupId, cur);
    }
    return [...map.entries()].map(([groupId, { groupLabel, rows }]) => {
      const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
      const units = new Set(rows.map((r) => (r.unit ?? "").trim()).filter((u) => u.length > 0));
      const mixedUnits = units.size > 1;
      const singleUnit = units.size === 1 ? [...units][0] : null;
      return { groupId, groupLabel, rows, totalQty, singleUnit, mixedUnits };
    });
  }, [resolvedReceiptLines]);

  useEffect(() => {
    if (!open) return;
    setMovementDate(localIsoDate());
    setLines([{ key: newDraftLineKey(), productId: "", qty: "1" }]);
    setInCheckedBy("");
    setInApprovedBy("");
    setInMovementNote("");
    setInvoiceFile(null);
  }, [open, warehouseId]);

  const disabled = stockLoading || peopleLoading || pending || movement.isPending;
  const desc = whName ? `${whName} · ${t("warehouse.depoInModalHint")}` : t("warehouse.depoInModalHint");
  const depoInDirty =
    lines.some((l) => l.productId.trim() !== "" || l.qty.trim() !== "1") ||
    inCheckedBy.trim() !== "" ||
    inApprovedBy.trim() !== "" ||
    inMovementNote.trim() !== "" ||
    invoiceFile != null;
  const requestDepoInClose = useDirtyGuard({
    isDirty: depoInDirty,
    isBlocked: pending || movement.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (warehouseId == null || warehouseId <= 0) return;
    const parsed: { productId: number; quantity: number }[] = [];
    for (const line of lines) {
      const pid = Number(line.productId);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const n = Number(line.qty.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("warehouse.invalidQuantity"));
        return;
      }
      parsed.push({ productId: pid, quantity: n });
    }
    if (parsed.length === 0) {
      notify.error(t("warehouse.depoAtLeastOneProductLine"));
      return;
    }
    const ck = Number(inCheckedBy);
    const ap = Number(inApprovedBy);
    if (!Number.isFinite(ck) || ck <= 0 || !Number.isFinite(ap) || ap <= 0) {
      notify.error(t("warehouse.personnelVerifierRequired"));
      return;
    }
    if (invoiceFile) {
      const v = await validateImageFileForUpload(invoiceFile);
      if (!v.ok) {
        notify.error(
          v.reason === "size"
            ? t("common.imageUploadTooLarge")
            : t("common.imageUploadNotImage")
        );
        return;
      }
    }
    setPending(true);
    try {
      await movement.mutateAsync({
        warehouseId,
        lines: parsed,
        movementDate,
        direction: "in",
        checkedByPersonnelId: ck,
        approvedByPersonnelId: ap,
        description: inMovementNote.trim() ? inMovementNote.trim() : null,
        invoicePhoto: invoiceFile,
      });
      notify.success(t("toast.warehouseInOk"));
      onClose();
    } catch (err) {
      notify.error(apiUserFacingMessage(err, t));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={requestDepoInClose}
      titleId={DEPO_TITLE_ID}
      title={t("warehouse.actionDepoProductIn")}
      description={desc}
      closeButtonLabel={t("common.close")}
      className={cn("w-full", lines.length >= 3 ? "max-w-2xl" : "max-w-lg")}
    >
      {stockLoading ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : (
        <form
          className="mt-3 flex max-h-[min(82dvh,34rem)] flex-col gap-3 overflow-y-auto [-webkit-overflow-scrolling:touch] sm:mt-4 sm:max-h-[min(78dvh,40rem)] sm:overflow-visible"
          onSubmit={(e) => void onSubmit(e)}
        >
          <DateField
            label={t("warehouse.quickMovementDate")}
            labelRequired
            required
            value={movementDate}
            onChange={(e) => setMovementDate(e.target.value)}
            disabled={disabled}
          />
          <Input
            label={t("warehouse.movementNote")}
            type="text"
            autoComplete="off"
            value={inMovementNote}
            onChange={(e) => setInMovementNote(e.target.value)}
            disabled={disabled}
          />
          <p className="-mt-1 text-xs leading-snug text-zinc-500">{t("warehouse.depoInSharedNoteHint")}</p>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("warehouse.depoInLinesSection")}
            </p>
            {lines.map((line, idx) => {
              const selectedRow = stockRows.find((r) => String(r.productId) === line.productId);
              const compact = lines.length >= 2;
              return (
                <div
                  key={line.key}
                  className={cn(
                    "rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/[0.03]",
                    compact ? "px-1.5 py-1 sm:px-2" : "p-2 sm:p-2.5"
                  )}
                >
                  <div className="flex min-w-0 flex-nowrap items-end gap-1.5 sm:gap-2">
                    <span
                      className={cn(
                        "flex shrink-0 select-none items-center justify-center rounded-md bg-zinc-100 font-bold tabular-nums text-zinc-500",
                        compact
                          ? "h-9 w-6 text-[0.6rem] sm:h-10 sm:w-7 sm:text-[0.65rem]"
                          : "h-9 w-7 text-[0.65rem] sm:h-10 sm:w-8 sm:text-xs"
                      )}
                      aria-hidden
                    >
                      {idx + 1}
                    </span>
                    <div
                      className="min-w-0 flex-1 basis-0"
                      title={
                        selectedRow?.unit
                          ? `${t("warehouse.productUnit")}: ${selectedRow.unit}`
                          : undefined
                      }
                    >
                      <Select
                        label={idx === 0 ? t("warehouse.movementProduct") : undefined}
                        ariaLabel={
                          idx > 0
                            ? `${t("warehouse.movementProduct")} (${idx + 1})`
                            : undefined
                        }
                        labelRequired={idx === 0}
                        name={`wh-list-depo-product-${line.key}`}
                        options={productOptions}
                        value={line.productId}
                        onChange={(e) => updateDepoLine(line.key, { productId: e.target.value })}
                        onBlur={() => {}}
                        disabled={disabled}
                        className={cn("min-w-0", compact && "min-h-11 py-2 text-sm")}
                      />
                    </div>
                    <div className={cn("shrink-0", compact ? "w-[4.25rem] sm:w-24" : "w-24 sm:w-28")}>
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        label={idx === 0 ? t("warehouse.qtyLabelDepoIn") : undefined}
                        labelRequired={idx === 0}
                        aria-label={idx > 0 ? t("warehouse.qtyLabelDepoIn") : undefined}
                        value={line.qty}
                        onChange={(e) => updateDepoLine(line.key, { qty: e.target.value })}
                        disabled={disabled}
                        className={cn(
                          "min-w-0 text-center tabular-nums",
                          compact && "min-h-11 py-2 text-sm"
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(
                        "shrink-0 self-end rounded-lg border-zinc-200 p-0 font-light leading-none text-zinc-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700",
                        compact
                          ? "mb-0.5 h-9 w-9 text-base sm:h-10 sm:w-10 sm:text-lg"
                          : "mb-0.5 h-10 w-10 text-lg"
                      )}
                      disabled={disabled || lines.length <= 1}
                      onClick={() => removeDepoLine(line.key)}
                      aria-label={t("warehouse.depoInRemoveLine")}
                      title={t("warehouse.depoInRemoveLine")}
                    >
                      <span aria-hidden>×</span>
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              className="min-h-10 w-full touch-manipulation text-sm sm:min-h-11 sm:w-auto"
              disabled={disabled}
              onClick={addDepoLine}
            >
              {t("warehouse.depoInAddLine")}
            </Button>
          </div>
          <Select
            label={t("warehouse.checkedByPersonnel")}
            labelRequired
            name="wh-list-depo-ck"
            options={personnelSelectOptions}
            value={inCheckedBy}
            onChange={(e) => setInCheckedBy(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          <Select
            label={t("warehouse.approvedByPersonnel")}
            labelRequired
            name="wh-list-depo-ap"
            options={personnelSelectOptions}
            value={inApprovedBy}
            onChange={(e) => setInApprovedBy(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          <div>
            <label htmlFor="wh-list-depo-invoice" className="mb-1 block text-sm font-medium text-zinc-700">
              {t("warehouse.invoicePhotoOptional")}
            </label>
            <input
              id="wh-list-depo-invoice"
              name="wh-list-depo-invoice"
              type="file"
              accept={IMAGE_FILE_INPUT_ACCEPT}
              className="block w-full max-w-full min-w-0 text-sm text-zinc-600 file:mr-3 file:max-w-full file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
              disabled={disabled}
              onChange={async (e) => {
                const input = e.target;
                const f = input.files?.[0] ?? null;
                if (!f) {
                  setInvoiceFile(null);
                  return;
                }
                const v = await validateImageFileForUpload(f);
                if (!v.ok) {
                  input.value = "";
                  setInvoiceFile(null);
                  notify.error(
                    v.reason === "size"
                      ? t("common.imageUploadTooLarge")
                      : t("common.imageUploadNotImage")
                  );
                  return;
                }
                setInvoiceFile(f);
              }}
            />
            <LocalImageFileThumb file={invoiceFile} />
          </div>

          {receiptParentGroups.length > 0 ? (
            <section
              className="rounded-xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/95 to-white p-3 shadow-sm ring-1 ring-emerald-900/[0.06] sm:p-4"
              aria-labelledby={DEPO_RECEIPT_SUMMARY_ID}
            >
              <h3
                id={DEPO_RECEIPT_SUMMARY_ID}
                className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900"
              >
                {t("warehouse.depoInReceiptSummaryTitle")}
              </h3>
              <ul className="mt-2.5 space-y-3">
                {receiptParentGroups.map((g) => (
                  <li
                    key={g.groupId}
                    className="rounded-lg border border-emerald-100/90 bg-white/90 px-2.5 py-2 sm:px-3"
                  >
                    <p className="text-xs font-semibold leading-snug text-zinc-900 sm:text-sm">
                      {g.groupLabel}
                    </p>
                    <ul className="mt-1.5 space-y-1 border-t border-zinc-100/80 pt-1.5">
                      {g.rows.map((r) => (
                        <li
                          key={r.key}
                          className="flex min-w-0 items-baseline justify-between gap-2 text-[0.7rem] leading-snug text-zinc-600 sm:text-xs"
                        >
                          <span className="min-w-0 truncate">{r.skuName}</span>
                          <span className="shrink-0 tabular-nums font-medium text-zinc-800">
                            {formatLocaleAmount(r.quantity, locale)}
                            {r.unit ? (
                              <span className="ml-0.5 font-normal text-zinc-500"> {r.unit}</span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-t border-emerald-100 pt-1.5">
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900">
                        {t("warehouse.depoInReceiptSummaryGroupTotal")}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-emerald-950 sm:text-base">
                        {formatLocaleAmount(g.totalQty, locale)}
                        {!g.mixedUnits && g.singleUnit ? (
                          <span className="ml-1 text-xs font-semibold text-emerald-800/90">
                            {g.singleUnit}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    {g.mixedUnits ? (
                      <p className="mt-1 text-[0.6rem] leading-snug text-amber-800/90">
                        {t("warehouse.depoInReceiptSummaryMixedUnitsHint")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 border-t border-zinc-200/80 bg-white/95 px-1 pt-2 pb-0.5 backdrop-blur-sm sm:static sm:mx-0 sm:flex-row sm:flex-wrap sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:pt-1 sm:backdrop-blur-none">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full touch-manipulation sm:w-auto sm:min-w-[7rem]"
              disabled={disabled}
              onClick={requestDepoInClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="min-h-11 w-full touch-manipulation sm:min-w-[10rem] sm:flex-1"
              disabled={disabled}
            >
              {t("warehouse.depoInSubmit")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function WarehouseListTransferModal({
  target,
  onClose,
}: {
  target: WhRef;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const open = target != null;
  const warehouseId = target?.id ?? null;
  const whName = target?.name?.trim() ?? "";

  const { data: stockRows = [], isPending: stockLoading } = useWarehouseStock(
    open && warehouseId != null && warehouseId > 0 ? warehouseId : null
  );
  const { data: branches = [], isPending: branchesLoading } = useBranchesList();
  const { data: peopleRaw = [], isPending: peopleLoading } = useWarehousePeopleOptions(open);
  const transfer = useTransferWarehouseToBranch();

  const inStockRows = useMemo(() => stockRows.filter((r) => r.quantity > 0), [stockRows]);

  const [movementDate, setMovementDate] = useState(() => localIsoDate());
  const [lines, setLines] = useState<LineDraft[]>(() => [
    { key: newDraftLineKey(), productId: "", qty: "1" },
  ]);
  const [branchId, setBranchId] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [trTransportedBy, setTrTransportedBy] = useState("");
  const [trSentBy, setTrSentBy] = useState("");
  const [trReceivedBy, setTrReceivedBy] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [freightPay, setFreightPay] = useState<WarehouseFreightPaymentSource>("REGISTER");
  const [freightPocket, setFreightPocket] = useState("");
  const [freightNote, setFreightNote] = useState("");
  const [pending, setPending] = useState(false);

  const personnelOptions = useMemo(
    () =>
      peopleRaw
        .filter((o) => o.personnelId != null && o.personnelId > 0)
        .map((o) => ({ value: String(o.personnelId), label: o.displayName })),
    [peopleRaw]
  );
  const personnelSelectOptions = useMemo(
    () => [{ value: "", label: t("warehouse.personnelPickPlaceholder") }, ...personnelOptions],
    [personnelOptions, t]
  );
  const productOptions = useMemo(
    () => [
      { value: "", label: t("warehouse.listQuickPickProduct") },
      ...inStockRows.map((r) => ({ value: String(r.productId), label: productLabel(r) })),
    ],
    [inStockRows, t]
  );
  const branchOptions = useMemo(
    () => [
      { value: "", label: t("warehouse.personnelPickPlaceholder") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const transferValuationLines = useMemo(() => {
    const out: { productId: number; quantity: number }[] = [];
    for (const line of lines) {
      const pid = Number(line.productId);
      const n = Number(line.qty.replace(",", "."));
      if (!Number.isFinite(pid) || pid <= 0 || !Number.isFinite(n) || n <= 0) continue;
      const row = inStockRows.find((r) => r.productId === pid);
      if (!row || n > row.quantity) continue;
      out.push({ productId: pid, quantity: n });
    }
    return out;
  }, [lines, inStockRows]);

  const addLine = useCallback(() => {
    setLines((ls) => [...ls, { key: newDraftLineKey(), productId: "", qty: "1" }]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((ls) => (ls.length <= 1 ? ls : ls.filter((l) => l.key !== key)));
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<Pick<LineDraft, "productId" | "qty">>) => {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  useEffect(() => {
    if (!open) return;
    setMovementDate(localIsoDate());
    setLines([{ key: newDraftLineKey(), productId: "", qty: "1" }]);
    setBranchId("");
    setTDesc("");
    setTrTransportedBy("");
    setTrSentBy("");
    setTrReceivedBy("");
    setFreightAmount("");
    setFreightPay("REGISTER");
    setFreightPocket("");
    setFreightNote("");
  }, [open, warehouseId]);

  const disabled =
    stockLoading ||
    branchesLoading ||
    peopleLoading ||
    pending ||
    transfer.isPending ||
    inStockRows.length === 0;
  const desc = whName ? `${whName} · ${t("warehouse.transferModalHint")}` : t("warehouse.transferModalHint");
  const transferDirty =
    lines.some((l) => l.productId.trim() !== "" || l.qty.trim() !== "1") ||
    branchId.trim() !== "" ||
    tDesc.trim() !== "" ||
    trTransportedBy.trim() !== "" ||
    trSentBy.trim() !== "" ||
    trReceivedBy.trim() !== "" ||
    freightAmount.trim() !== "" ||
    freightPocket.trim() !== "" ||
    freightNote.trim() !== "";
  const requestTransferClose = useDirtyGuard({
    isDirty: transferDirty,
    isBlocked: pending || transfer.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (warehouseId == null || warehouseId <= 0) return;
    const b = Number(branchId);
    if (!Number.isFinite(b) || b <= 0) {
      notify.error(t("warehouse.transferPickBranch"));
      return;
    }
    const parsed: { productId: number; quantity: number }[] = [];
    for (const line of lines) {
      const pid = Number(line.productId);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const n = Number(line.qty.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        notify.error(t("warehouse.invalidQuantity"));
        return;
      }
      const row = inStockRows.find((r) => r.productId === pid);
      if (!row || n > row.quantity) {
        notify.error(t("warehouse.invalidQuantity"));
        return;
      }
      parsed.push({ productId: pid, quantity: n });
    }
    if (parsed.length === 0) {
      notify.error(t("warehouse.transferAtLeastOneProductLine"));
      return;
    }
    const transportedBy = Number(trTransportedBy);
    const sentBy = Number(trSentBy);
    const receivedBy = Number(trReceivedBy);
    if (
      !Number.isFinite(transportedBy) ||
      transportedBy <= 0 ||
      !Number.isFinite(sentBy) ||
      sentBy <= 0 ||
      !Number.isFinite(receivedBy) ||
      receivedBy <= 0
    ) {
      notify.error(t("warehouse.transferPersonnelRolesRequired"));
      return;
    }
    const frN = Number(freightAmount.replace(",", "."));
    const hasFreight = Number.isFinite(frN) && frN > 0;
    let pocketPid: number | undefined;
    if (hasFreight && freightPay === "PERSONNEL_POCKET") {
      const p = Number(freightPocket);
      if (!Number.isFinite(p) || p <= 0) {
        notify.error(t("warehouse.transferFreightPocketRequired"));
        return;
      }
      pocketPid = p;
    }
    setPending(true);
    try {
      await transfer.mutateAsync({
        warehouseId,
        branchId: b,
        lines: parsed,
        movementDate,
        description: tDesc.trim() ? tDesc.trim() : null,
        transportedByPersonnelId: transportedBy,
        sentByPersonnelId: sentBy,
        receivedByPersonnelId: receivedBy,
        ...(hasFreight
          ? {
              freightAmount: frN,
              freightExpensePaymentSource: freightPay,
              freightExpensePocketPersonnelId: pocketPid ?? null,
              freightNote: freightNote.trim() ? freightNote.trim() : null,
            }
          : {}),
      });
      notify.success(t("toast.transferToBranchOk"));
      onClose();
    } catch (err) {
      notify.error(apiUserFacingMessage(err, t));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={requestTransferClose}
      titleId={TRANSFER_TITLE_ID}
      title={t("warehouse.transferRowTitle")}
      description={desc}
      closeButtonLabel={t("common.close")}
    >
      {stockLoading ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : inStockRows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">{t("warehouse.listQuickTransferNoStock")}</p>
      ) : (
        <form
          className="mt-4 flex max-h-[min(78dvh,28rem)] flex-col gap-3 overflow-y-auto [-webkit-overflow-scrolling:touch] sm:max-h-none sm:overflow-visible"
          onSubmit={(e) => void onSubmit(e)}
        >
          <DateField
            label={t("warehouse.quickMovementDate")}
            labelRequired
            required
            value={movementDate}
            onChange={(e) => setMovementDate(e.target.value)}
            disabled={disabled}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-800">{t("warehouse.transferLinesSection")}</p>
            {lines.map((line, idx) => {
              const selectedRow = inStockRows.find((r) => String(r.productId) === line.productId);
              return (
                <div
                  key={line.key}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <Select
                        label={t("warehouse.transferProduct")}
                        labelRequired={idx === 0}
                        name={`wh-list-tr-product-${line.key}`}
                        options={productOptions}
                        value={line.productId}
                        onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                        onBlur={() => {}}
                        disabled={disabled}
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        label={t("warehouse.transferQty")}
                        labelRequired={idx === 0}
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                        disabled={disabled}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full shrink-0 sm:mb-0.5 sm:w-auto"
                      disabled={disabled || lines.length <= 1}
                      onClick={() => removeLine(line.key)}
                      aria-label={t("warehouse.transferRemoveLine")}
                    >
                      {t("warehouse.transferRemoveLine")}
                    </Button>
                  </div>
                  {selectedRow ? (
                    <p className="mt-2 text-sm font-medium tabular-nums text-zinc-700">
                      {t("warehouse.transferStockOnHand")}: {selectedRow.quantity}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <Button type="button" variant="secondary" className="w-full min-h-11 sm:w-auto" disabled={disabled} onClick={addLine}>
              {t("warehouse.transferAddLine")}
            </Button>
          </div>
          <Select
            label={t("warehouse.transferBranch")}
            labelRequired
            name="wh-list-tr-br"
            options={branchOptions}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            onBlur={() => {}}
            disabled={disabled || branchesLoading}
          />
          <WarehouseTransferFreightValuationBar
            warehouseId={warehouseId}
            lines={transferValuationLines}
            enabled={open && !disabled}
            onApplySuggestedFreight={setFreightAmount}
          />
          <WarehouseTransferFreightFields
            freightAmount={freightAmount}
            onFreightAmountChange={setFreightAmount}
            freightPaymentSource={freightPay}
            onFreightPaymentSourceChange={setFreightPay}
            freightPocketPersonnelId={freightPocket}
            onFreightPocketPersonnelIdChange={setFreightPocket}
            freightNote={freightNote}
            onFreightNoteChange={setFreightNote}
            personnelSelectOptions={personnelSelectOptions}
            disabled={disabled}
          />
          <Input
            type="text"
            autoComplete="off"
            label={t("warehouse.transferDescription")}
            placeholder={t("warehouse.transferDescriptionPlaceholder")}
            value={tDesc}
            onChange={(e) => setTDesc(e.target.value)}
            disabled={disabled}
          />
          <Select
            label={t("warehouse.transportedByPersonnel")}
            labelRequired
            name="wh-list-tr-transported"
            options={personnelSelectOptions}
            value={trTransportedBy}
            onChange={(e) => setTrTransportedBy(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          <Select
            label={t("warehouse.sentByPersonnel")}
            labelRequired
            name="wh-list-tr-sent"
            options={personnelSelectOptions}
            value={trSentBy}
            onChange={(e) => setTrSentBy(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          <Select
            label={t("warehouse.receivedByPersonnel")}
            labelRequired
            name="wh-list-tr-received"
            options={personnelSelectOptions}
            value={trReceivedBy}
            onChange={(e) => setTrReceivedBy(e.target.value)}
            onBlur={() => {}}
            disabled={disabled}
          />
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full sm:w-auto sm:min-w-[7rem]"
              disabled={disabled}
              onClick={requestTransferClose}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="min-h-11 w-full sm:min-w-[10rem] sm:flex-1" disabled={disabled}>
              {t("warehouse.transferSubmit")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
