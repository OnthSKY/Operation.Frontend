"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { resolveReportDatePreset } from "@/modules/reports/lib/report-period-helpers";
import { Button } from "@/shared/ui/Button";
import { ToggleButton } from "@/shared/ui/ToggleButton";
import { DateField } from "@/shared/ui/DateField";

type Preset = "all" | "today" | "thisWeek" | "month" | "custom";

type Props = {
  locale: "tr" | "en";
  branchSelected: boolean;
  /** Kalemlerde kullanıcı içeriği var mı — varsa "değiştir / sona ekle" sorulur. */
  hasContent: boolean;
  onLoad: (
    range: { dateFrom: string; dateTo: string; label: string },
    mode: "replace" | "append"
  ) => Promise<number>;
};

/**
 * "Tüm Ürünleri Getir": seçili şubeye gelen ürünleri tarih aralığına göre Kalemler'e yükler.
 * Hazır aralıklar `resolveReportDatePreset` ile hesaplanır (raporlarla aynı kaynak); boş = tüm zamanlar.
 */
export function OasBranchProductsBar({ locale, branchSelected, hasContent, onLoad }: Props) {
  const { t } = useI18n();
  const [preset, setPreset] = useState<Preset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const range =
    preset === "all"
      ? { dateFrom: "", dateTo: "" }
      : preset === "custom"
        ? { dateFrom: customFrom, dateTo: customTo }
        : resolveReportDatePreset(preset);
  const label =
    !range.dateFrom && !range.dateTo
      ? t("reports.orderAccountStatementBranchProductsAllTime")
      : `${formatLocaleDate(range.dateFrom, locale, "…")} – ${formatLocaleDate(range.dateTo, locale, "…")}`;
  const customInvalid =
    preset === "custom" && customFrom.length === 10 && customTo.length === 10 && customFrom > customTo;

  const run = async (mode: "replace" | "append") => {
    setConfirming(false);
    setBusy(true);
    try {
      const n = await onLoad({ ...range, label }, mode);
      if (n > 0) {
        notify.success(t("reports.orderAccountStatementBranchProductsLoaded").replace("{count}", String(n)));
      }
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const presets: { id: Preset; label: string }[] = [
    { id: "all", label: t("reports.orderAccountStatementBranchProductsAllTime") },
    { id: "today", label: t("branch.filterToday") },
    { id: "thisWeek", label: t("reports.orderAccountStatementBranchProductsThisWeek") },
    { id: "month", label: t("reports.presetThisMonth") },
    { id: "custom", label: t("reports.orderAccountStatementBranchProductsCustom") },
  ];

  return (
    <div className="mb-2 rounded-lg border border-sky-200 bg-sky-50/60 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((p) => (
          <ToggleButton
            key={p.id}
            active={preset === p.id}
            tone={p.id === "all" ? "zinc" : "blue"}
            className="!min-h-8 px-2.5 text-[11px]"
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </ToggleButton>
        ))}
        <Button
          type="button"
          variant="primary"
          className="!min-h-8 !w-auto px-2.5 text-[11px] sm:ml-auto"
          busy={busy}
          disabled={!branchSelected || busy || customInvalid}
          title={branchSelected ? undefined : t("reports.orderAccountStatementBranchProductsBranchRequired")}
          onClick={() => (hasContent ? setConfirming(true) : void run("replace"))}
        >
          {t("reports.orderAccountStatementBranchProductsButton")}
        </Button>
      </div>
      {preset === "custom" ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <DateField
            label={t("branch.filterDateFrom")}
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="min-w-0"
          />
          <DateField
            label={t("branch.filterDateTo")}
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="min-w-0"
          />
        </div>
      ) : null}
      {!branchSelected ? (
        <p className="mt-1.5 text-[11px] text-sky-900">{t("reports.orderAccountStatementBranchProductsBranchRequired")}</p>
      ) : null}
      {customInvalid ? (
        <p className="mt-1.5 text-[11px] text-rose-700">{t("reports.orderAccountStatementBranchProductsRangeInvalid")}</p>
      ) : null}
      {confirming ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
          <span className="mr-auto">{t("reports.orderAccountStatementBranchProductsConfirm")}</span>
          <Button type="button" variant="primary" className="!min-h-7 !w-auto px-2 text-[11px]" onClick={() => void run("replace")}>
            {t("reports.orderAccountStatementBranchProductsReplace")}
          </Button>
          <Button type="button" variant="secondary" className="!min-h-7 !w-auto px-2 text-[11px]" onClick={() => void run("append")}>
            {t("reports.orderAccountStatementBranchProductsAppend")}
          </Button>
          <Button type="button" variant="ghost" className="!min-h-7 !w-auto px-2 text-[11px]" onClick={() => setConfirming(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
