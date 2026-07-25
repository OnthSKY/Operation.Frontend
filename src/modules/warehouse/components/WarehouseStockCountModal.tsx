"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  useRegisterWarehouseStockCount,
  useWarehousePeopleOptions,
  useWarehouseStock,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import {
  mapWarehousePersonnelOptions,
  withWarehousePersonnelPickPlaceholder,
} from "@/modules/warehouse/lib/warehouse-personnel-select";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
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

const STOCK_COUNT_TITLE_ID = "wh-stock-count-title";

const WH_QUICK_SHEET_BACKDROP =
  "flex flex-col justify-end bg-zinc-950/50 p-0 pt-[env(safe-area-inset-top,0px)] sm:flex-row sm:items-center sm:justify-center sm:bg-zinc-950/50 sm:p-5 lg:px-10 lg:py-7 xl:px-14 xl:py-8";
const whSheetPanelClass =
  "flex h-[min(100dvh,100svh)] max-h-[100dvh] w-full !max-w-none flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white p-3 shadow-2xl sm:h-auto sm:max-h-[95dvh] sm:rounded-2xl sm:border-zinc-200/90 sm:p-6 sm:max-w-[min(100vw-4rem,72rem)]";

export type WarehouseStockCountTarget = { id: number; name: string } | null;

function normSearch(s: string) {
  return s.toLocaleLowerCase("tr-TR").normalize("NFD");
}

function productDisplayLabel(r: WarehouseProductStockRow) {
  const u = r.unit?.trim();
  const base = u ? `${r.productName} (${u})` : r.productName;
  const p = r.parentProductName?.trim();
  const sameAsParent =
    p && p.localeCompare(r.productName.trim(), undefined, { sensitivity: "accent" }) === 0;
  return p && !sameAsParent ? `${p} › ${base}` : base;
}

/** Kullanıcının girdiği sayım metnini sayıya çevirir; boş veya geçersiz ise null. */
function parseCount(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function WarehouseStockCountModal({
  target,
  onClose,
}: {
  target: WarehouseStockCountTarget;
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
  const stockCount = useRegisterWarehouseStockCount();

  const [countDate, setCountDate] = useState(() => localIsoDate());
  const [description, setDescription] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [search, setSearch] = useState("");
  // productId -> ham sayım metni. Sadece kullanıcının girdiği ürünler düzeltilir.
  const [counts, setCounts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    setCountDate(localIsoDate());
    setDescription("");
    setCheckedBy("");
    setApprovedBy("");
    setSearch("");
    setCounts({});
  }, [open, warehouseId]);

  const personnelSelectOptions = useMemo(
    () =>
      withWarehousePersonnelPickPlaceholder(
        mapWarehousePersonnelOptions(peopleRaw),
        t("warehouse.personnelPickPlaceholder")
      ),
    [peopleRaw, t]
  );

  const filteredRows = useMemo(() => {
    const qn = normSearch(search.trim());
    if (!qn) return stockRows;
    return stockRows.filter((r) =>
      normSearch(`${r.productName ?? ""} ${r.parentProductName ?? ""}`).includes(qn)
    );
  }, [stockRows, search]);

  // Kullanıcının doldurduğu satırlar → (ürün, sayım, önceki, fark).
  const enteredLines = useMemo(() => {
    const out: { row: WarehouseProductStockRow; counted: number; delta: number }[] = [];
    for (const r of stockRows) {
      const raw = counts[r.productId];
      const counted = raw != null ? parseCount(raw) : null;
      if (counted == null) continue;
      out.push({ row: r, counted, delta: counted - Number(r.quantity) });
    }
    return out;
  }, [stockRows, counts]);

  const changedCount = enteredLines.filter((l) => l.delta !== 0).length;

  const disabled = stockLoading || peopleLoading || stockCount.isPending;
  const dirty =
    description.trim() !== "" ||
    checkedBy.trim() !== "" ||
    approvedBy.trim() !== "" ||
    Object.values(counts).some((v) => v.trim() !== "");
  const requestClose = useDirtyGuard({
    isDirty: dirty,
    isBlocked: stockCount.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  const fmt = (n: number) => formatLocaleAmount(n, locale);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (warehouseId == null || warehouseId <= 0) return;

    // Ham girişlerde geçersiz (negatif / sayı olmayan) değer var mı?
    const invalid = Object.entries(counts).some(
      ([, raw]) => raw.trim() !== "" && parseCount(raw) == null
    );
    if (invalid) {
      notify.error(t("warehouse.stockCountInvalidQuantity"));
      return;
    }
    if (enteredLines.length === 0) {
      notify.error(t("warehouse.stockCountNoLines"));
      return;
    }
    if (description.trim() === "") {
      notify.error(t("warehouse.stockCountDescriptionRequired"));
      return;
    }
    const ck = Number(checkedBy);
    const ap = Number(approvedBy);
    if (!Number.isFinite(ck) || ck <= 0 || !Number.isFinite(ap) || ap <= 0) {
      notify.error(t("warehouse.personnelVerifierRequired"));
      return;
    }

    try {
      const res = await stockCount.mutateAsync({
        warehouseId,
        countDate,
        description: description.trim(),
        checkedByPersonnelId: ck,
        approvedByPersonnelId: ap,
        lines: enteredLines.map((l) => ({ productId: l.row.productId, actualCount: l.counted })),
      });
      const applied = res.lines.filter((l) => l.movementId != null).length;
      notify.success(t("warehouse.stockCountOk").replace("{{count}}", String(applied)));
      onClose();
    } catch (err) {
      notify.error(apiUserFacingMessage(err, t));
    }
  };

  const desc = whName
    ? `${whName} · ${t("warehouse.stockCountHint")}`
    : t("warehouse.stockCountHint");

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={STOCK_COUNT_TITLE_ID}
      title={t("warehouse.actionStockCount")}
      description={desc}
      closeButtonLabel={t("common.close")}
      backdropClassName={WH_QUICK_SHEET_BACKDROP}
      className={whSheetPanelClass}
    >
      {stockLoading ? (
        <p className="mt-4 min-h-0 flex-1 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : (
        <form
          className="mt-3 flex min-h-0 flex-1 flex-col gap-3 sm:mt-4"
          onSubmit={(e) => void onSubmit(e)}
        >
          <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
            <DateField
              label={t("warehouse.stockCountDate")}
              labelRequired
              required
              value={countDate}
              onChange={(e) => setCountDate(e.target.value)}
              disabled={disabled}
            />
            <Input
              label={t("warehouse.stockCountDescription")}
              labelRequired
              type="text"
              autoComplete="off"
              placeholder={t("warehouse.stockCountDescriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label={t("warehouse.checkedByPersonnel")}
              labelRequired
              name="wh-stock-count-ck"
              options={personnelSelectOptions}
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              onBlur={() => {}}
              disabled={disabled}
            />
            <Select
              label={t("warehouse.approvedByPersonnel")}
              labelRequired
              name="wh-stock-count-ap"
              options={personnelSelectOptions}
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              onBlur={() => {}}
              disabled={disabled}
            />
          </div>

          <p className="-mt-1 text-xs leading-snug text-zinc-500">
            {t("warehouse.stockCountSharedHint")}
          </p>

          <Input
            type="search"
            autoComplete="off"
            placeholder={t("warehouse.stockCountSearchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />

          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-200/90">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{t("warehouse.stockCountColProduct")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("warehouse.stockCountColCurrent")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("warehouse.stockCountColCounted")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("warehouse.stockCountColDelta")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-zinc-500">
                      {t("warehouse.stockCountEmpty")}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const raw = counts[r.productId] ?? "";
                    const counted = parseCount(raw);
                    const hasEntry = raw.trim() !== "";
                    const delta = counted != null ? counted - Number(r.quantity) : null;
                    return (
                      <tr key={r.productId} className="border-t border-zinc-100">
                        <td className="px-3 py-1.5 text-zinc-800">{productDisplayLabel(r)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-zinc-600">
                          {fmt(Number(r.quantity))}
                        </td>
                        <td className="px-3 py-1 text-right">
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            aria-label={`${t("warehouse.stockCountColCounted")} — ${r.productName}`}
                            className="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums focus:border-zinc-400 focus:outline-none"
                            value={raw}
                            placeholder={fmt(Number(r.quantity))}
                            onChange={(e) =>
                              setCounts((c) => ({ ...c, [r.productId]: e.target.value }))
                            }
                            disabled={disabled}
                          />
                        </td>
                        <td
                          className={cn(
                            "px-3 py-1.5 text-right tabular-nums",
                            !hasEntry || delta == null
                              ? "text-zinc-300"
                              : delta > 0
                                ? "text-emerald-600"
                                : delta < 0
                                  ? "text-red-600"
                                  : "text-zinc-400"
                          )}
                        >
                          {!hasEntry
                            ? "—"
                            : delta == null
                              ? t("warehouse.stockCountInvalidShort")
                              : delta === 0
                                ? "0"
                                : `${delta > 0 ? "+" : ""}${fmt(delta)}`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              {t("warehouse.stockCountSummary")
                .replace("{{entered}}", String(enteredLines.length))
                .replace("{{changed}}", String(changedCount))}
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={requestClose} disabled={stockCount.isPending}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={disabled || enteredLines.length === 0}>
                {t("warehouse.stockCountSubmit")}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
