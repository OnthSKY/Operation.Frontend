"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  useCreateSupplierPayment,
  useSupplierOpenInvoices,
} from "@/modules/suppliers/hooks/useSupplierQueries";

type Props = {
  open: boolean;
  supplierId: number | null;
  supplierName: string;
  currencyCode: string;
  onClose: () => void;
  onSuccess?: () => void;
};

type AllocMode = "advance" | "auto" | "manual";

/**
 * Tedarikçiye toplam tutar üzerinden ödeme:
 *  - Tutar girilir (max = açık borç toplamı).
 *  - "Otomatik" mod (varsayılan): tutar en eski açık faturadan başlanarak FIFO dağıtılır.
 *  - "Manuel" mod: kullanıcı açık faturalara satır satır dağıtır.
 *  - Avans (kalan) = ödeme tutarı − dağıtılan toplam.
 */
export function SupplierPaymentModal(p: Props) {
  const { t, locale } = useI18n();
  const tr = locale === "tr";
  const cur = (p.currencyCode || "TRY").toUpperCase();

  const openQ = useSupplierOpenInvoices(p.supplierId, p.open && p.supplierId != null);
  const openInvoices = useMemo(() => {
    const list = openQ.data ?? [];
    return [...list]
      .filter((x) => (x.openAmount ?? 0) > 0)
      .sort(
        (a, b) =>
          a.documentDate.localeCompare(b.documentDate) || a.id - b.id,
      );
  }, [openQ.data]);

  const totalOpen = useMemo(
    () => openInvoices.reduce((sum, x) => sum + x.openAmount, 0),
    [openInvoices],
  );

  const { data: branches = [] } = useBranchesList();
  const branchOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: tr ? "Şube seçin" : "Pick branch" },
      ...[...branches]
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        )
        .map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, tr],
  );

  const sourceOptions = useMemo<SelectOption[]>(
    () => [
      { value: "PATRON", label: t("suppliers.sourcePatron") },
      { value: "CASH", label: t("suppliers.sourceCash") },
      {
        value: "PERSONNEL_HELD_REGISTER_CASH",
        label: t("suppliers.sourcePersonnelHeldRegisterCash"),
      },
    ],
    [t],
  );

  const todayIso = () => new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(todayIso);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("PATRON");
  const [branchId, setBranchId] = useState("");
  const [desc, setDesc] = useState("");
  const [mode, setMode] = useState<AllocMode>("advance");
  const [manualAlloc, setManualAlloc] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (!p.open) return;
    setDate(todayIso());
    setAmount("");
    setSource("PATRON");
    setBranchId("");
    setDesc("");
    setMode("advance");
    setManualAlloc({});
    setError(null);
  }, [p.open, p.supplierId]);

  const numAmount = parseAmount(amount);
  // Avans modunda üst sınır yok; FIFO/Manuel modunda açık borcu aşamaz.
  const overOpen =
    (mode === "auto" || mode === "manual") && numAmount > totalOpen + 0.001;

  const manualTotal = useMemo(
    () =>
      Object.values(manualAlloc).reduce(
        (s, v) => s + parseAmount(v),
        0,
      ),
    [manualAlloc],
  );

  const allocations = useMemo(() => {
    if (numAmount <= 0) return [] as Array<{ invoiceId: number; amount: number }>;
    if (mode === "advance") return [];
    if (mode === "auto") {
      let remaining = numAmount;
      const out: Array<{ invoiceId: number; amount: number }> = [];
      for (const inv of openInvoices) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, inv.openAmount);
        if (take > 0) {
          out.push({ invoiceId: inv.id, amount: round2(take) });
          remaining = round2(remaining - take);
        }
      }
      return out;
    }
    return openInvoices
      .map((inv) => {
        const v = parseAmount(manualAlloc[inv.id] ?? "");
        return v > 0 ? { invoiceId: inv.id, amount: round2(v) } : null;
      })
      .filter((x): x is { invoiceId: number; amount: number } => x != null);
  }, [numAmount, mode, openInvoices, manualAlloc]);

  const allocatedTotal = useMemo(
    () => allocations.reduce((s, a) => s + a.amount, 0),
    [allocations],
  );
  const advance = round2(numAmount - allocatedTotal);

  const createMut = useCreateSupplierPayment();
  const saving = createMut.isPending;

  const needsBranch =
    source === "CASH" || source === "PERSONNEL_HELD_REGISTER_CASH";

  const canSave =
    !saving &&
    numAmount > 0 &&
    !overOpen &&
    (!needsBranch || branchId !== "") &&
    (mode === "auto" || allocatedTotal <= numAmount + 0.001) &&
    // manuelde her bir alloc kendi fatura open'ını aşmasın
    (mode === "auto" ||
      allocations.every((a) => {
        const inv = openInvoices.find((i) => i.id === a.invoiceId);
        return inv ? a.amount <= inv.openAmount + 0.001 : false;
      }));

  const handleSave = async () => {
    setError(null);
    try {
      await createMut.mutateAsync({
        supplierId: p.supplierId ?? null,
        paymentDate: date,
        amount: round2(numAmount),
        currencyCode: cur,
        sourceType: source,
        branchId: needsBranch ? Number(branchId) || null : null,
        description: desc.trim() || null,
        allocations,
      });
      p.onSuccess?.();
      p.onClose();
    } catch (e) {
      setError(toErrorMessage(e));
    }
  };

  const fillRemainingFromOpen = () => setAmount(formatRaw(totalOpen));
  const distributeManualAll = () => {
    // Manuel modda kalan tutarı FIFO sırayla doldur (kullanıcı bir tıkla tamamlasın).
    let remaining = numAmount;
    const next: Record<number, string> = {};
    for (const inv of openInvoices) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, inv.openAmount);
      if (take > 0) {
        next[inv.id] = formatRaw(take);
        remaining = round2(remaining - take);
      }
    }
    setManualAlloc(next);
  };

  return (
    <Modal
      open={p.open}
      onClose={p.onClose}
      titleId="supplier-payment-title"
      title={tr ? "Tedarikçiye ödeme" : "Pay supplier"}
      wide
      wideFixedHeight
      nested
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-5 sm:pb-4">
        {/* Hero: açık borç */}
        <section
          className={cn(
            "rounded-2xl border p-4 shadow-sm",
            totalOpen > 0
              ? "border-red-200/70 bg-gradient-to-br from-red-50/80 via-white to-white"
              : "border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-white",
          )}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-zinc-500">
                {p.supplierName}
              </p>
              <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                {tr ? "Açık borç" : "Open balance"}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-2xl font-bold tabular-nums sm:text-3xl",
                  totalOpen > 0 ? "text-red-700" : "text-emerald-700",
                )}
              >
                {formatLocaleAmount(totalOpen, locale, cur)}
              </p>
            </div>
            {totalOpen > 0 ? (
              <Button
                type="button"
                variant="secondary"
                className="!min-h-10 px-3 text-xs"
                onClick={fillRemainingFromOpen}
              >
                {tr ? "Tamamını öde" : "Pay all"}
              </Button>
            ) : null}
          </div>
        </section>

        {/* Form: tutar + kaynak */}
        <section className="flex flex-col gap-3">
          <Input
            label={tr ? "Ödenecek tutar" : "Amount"}
            labelRequired
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={
              overOpen
                ? tr
                  ? "Açık borçtan fazla ödeyemezsiniz."
                  : "Cannot exceed open balance."
                : undefined
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateField
              label={t("suppliers.paymentDate")}
              labelRequired
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Select
              name="paymentSource"
              label={t("suppliers.sourceType")}
              options={sourceOptions}
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                if (
                  e.target.value !== "CASH" &&
                  e.target.value !== "PERSONNEL_HELD_REGISTER_CASH"
                )
                  setBranchId("");
              }}
              onBlur={() => {}}
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
          </div>
          {needsBranch ? (
            <Select
              name="paymentBranch"
              label={t("suppliers.paymentBranch")}
              labelRequired
              options={branchOptions}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              onBlur={() => {}}
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
          ) : null}
          <Input
            label={t("suppliers.description")}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </section>

        {/* Dağıtım */}
        {numAmount > 0 ? (
          <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-3 ring-1 ring-zinc-100/60 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {tr ? "Faturalara dağıtım" : "Allocation"}
              </p>
              <div className="inline-flex flex-wrap rounded-full bg-white p-0.5 shadow-sm ring-1 ring-zinc-200">
                <ModeButton
                  active={mode === "advance"}
                  onClick={() => setMode("advance")}
                  label={tr ? "Avans" : "Advance"}
                />
                <ModeButton
                  active={mode === "auto"}
                  onClick={() => setMode("auto")}
                  label={tr ? "Otomatik" : "Auto"}
                />
                <ModeButton
                  active={mode === "manual"}
                  onClick={() => {
                    setMode("manual");
                    if (Object.keys(manualAlloc).length === 0)
                      distributeManualAll();
                  }}
                  label={tr ? "Manuel" : "Manual"}
                />
              </div>
            </div>

            {mode === "advance" ? (
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                {tr
                  ? "Faturaya işaretlemeden tedarikçi carısına avans olarak kaydedilecek. Sonradan istediğiniz faturaya dağıtabilirsiniz."
                  : "Recorded as an open credit to the supplier; can be allocated to invoices later."}
              </p>
            ) : mode === "auto" ? (
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                {tr
                  ? "En eski faturadan başlanarak tutar otomatik dağıtılacak."
                  : "Amount will be auto-allocated from the oldest invoice first."}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {openInvoices.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    {tr ? "Açık fatura yok." : "No open invoices."}
                  </p>
                ) : (
                  openInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-2.5 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          #{inv.documentNumber ?? inv.id}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {inv.documentDate.slice(0, 10)} ·{" "}
                          {tr ? "Açık" : "Open"}:{" "}
                          <span className="tabular-nums text-zinc-700">
                            {formatLocaleAmount(inv.openAmount, locale, cur)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          label=""
                          inputMode="decimal"
                          value={manualAlloc[inv.id] ?? ""}
                          onChange={(e) =>
                            setManualAlloc((m) => ({
                              ...m,
                              [inv.id]: e.target.value,
                            }))
                          }
                          className="!w-28 text-right"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="!min-h-9 px-2 text-[0.7rem]"
                          onClick={() =>
                            setManualAlloc((m) => ({
                              ...m,
                              [inv.id]: formatRaw(inv.openAmount),
                            }))
                          }
                        >
                          {tr ? "Max" : "Max"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                {openInvoices.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!min-h-9 px-3 text-xs"
                      onClick={distributeManualAll}
                    >
                      {tr ? "Tutarı FIFO doldur" : "Auto-fill FIFO"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!min-h-9 px-3 text-xs"
                      onClick={() => setManualAlloc({})}
                    >
                      {tr ? "Sıfırla" : "Reset"}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Summary chips */}
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <SummaryChip
                label={tr ? "Tutar" : "Amount"}
                value={formatLocaleAmount(numAmount, locale, cur)}
              />
              <SummaryChip
                label={tr ? "Dağıtılan" : "Allocated"}
                value={formatLocaleAmount(allocatedTotal, locale, cur)}
                tone={allocatedTotal > numAmount ? "danger" : "neutral"}
              />
              <SummaryChip
                label={tr ? "Avans (kalan)" : "Advance"}
                value={formatLocaleAmount(advance > 0 ? advance : 0, locale, cur)}
                tone={advance > 0 ? "warn" : "neutral"}
              />
            </dl>
          </section>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 shadow-sm"
          >
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-3 mt-auto flex flex-col-reverse gap-2 border-t border-zinc-100 bg-white px-3 pb-2 pt-3 sm:-mx-5 sm:flex-row sm:justify-end sm:px-5">
          <Button type="button" variant="secondary" onClick={p.onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            {saving
              ? tr
                ? "Kaydediliyor…"
                : "Saving…"
              : tr
                ? "Ödemeyi kaydet"
                : "Save payment"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full px-3 text-xs font-semibold transition",
        active
          ? "bg-violet-600 text-white shadow-sm"
          : "text-zinc-600 hover:text-zinc-900",
      )}
    >
      {label}
    </button>
  );
}

function SummaryChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warn" | "danger";
}) {
  const palette =
    tone === "danger"
      ? "bg-red-50 text-red-800 ring-red-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-white text-zinc-800 ring-zinc-200";
  return (
    <div className={cn("rounded-xl px-2.5 py-2 ring-1", palette)}>
      <dt className="truncate text-[0.6rem] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-bold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function parseAmount(s: string): number {
  if (!s) return 0;
  const norm = String(s)
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number(norm);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatRaw(n: number): string {
  return round2(n).toFixed(2).replace(".", ",");
}
