"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { BranchPdfSettlementOptionsFields } from "@/modules/branch/components/BranchPdfSettlementOptionsFields";
import {
  branchPdfPresetOptions,
  type BranchPdfPreset,
  type BranchSettlementPdfOptions,
  openPersonnelSettlementPrintWindow,
} from "@/modules/personnel/lib/personnel-settlement-print";
import { fetchOutboundInvoices } from "@/modules/order-account-statement/api/outbound-invoices-api";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import {
  parseSettlementSeasonYearChoice,
  settlementSeasonYearSelectOptions,
} from "@/modules/personnel/lib/settlement-print-season";
import type { Branch } from "@/types/branch";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useMemo, useState } from "react";

const TITLE_ID = "branch-pdf-options-title";

type Props = {
  branch: Branch | null;
  branchNameById: Map<number, string>;
  locale: Locale;
  onClose: () => void;
};

export function BranchPdfSettlementOptionsModal({
  branch,
  branchNameById,
  locale,
  onClose,
}: Props) {
  const { t } = useI18n();
  // Varsayılan: Özet Rapor. Elle bir seçenek değişirse rapor tipi «Özel» olur.
  const [preset, setPreset] = useState<BranchPdfPreset>("summary");
  const [cariOpen, setCariOpen] = useState(false);
  const [opts, setOpts] = useState<BranchSettlementPdfOptions>(() =>
    branchPdfPresetOptions("summary", false)
  );
  const [busy, setBusy] = useState(false);
  const [seasonChoice, setSeasonChoice] = useState("");
  // Cari toggle her zaman görünür (eklemeyi sorar). Açık bakiye (cari borç) varsa
  // default açık; yoksa kapalı. baseline = otomatik-ayarlı kirlilik tabanı.
  const [baseline, setBaseline] = useState<BranchSettlementPdfOptions>(() =>
    branchPdfPresetOptions("summary", false)
  );

  // Şube değişince (modal yeni şubeyle açılınca) seçimleri render sırasında sıfırla —
  // efekt içinde senkron setState yerine React'in «prop değişince state ayarla» deseni.
  const [resetFor, setResetFor] = useState<Branch | null>(branch);
  if (branch !== resetFor) {
    setResetFor(branch);
    if (branch) {
      const base = branchPdfPresetOptions("summary", false);
      setOpts(base);
      setBaseline(base);
      setPreset("summary");
      setCariOpen(false);
      setSeasonChoice("");
    }
  }

  useEffect(() => {
    if (!branch) return;
    const base = branchPdfPresetOptions("summary", false);
    let cancelled = false;
    void (async () => {
      try {
        const all = await fetchOutboundInvoices();
        if (cancelled) return;
        const openSum = all
          .filter((i) => i.counterpartyType === "branch" && i.counterpartyId === branch.id)
          .reduce((s, i) => s + (Number(i.openAmount) || 0), 0);
        if (openSum > 0.009) {
          setCariOpen(true);
          setOpts((o) => ({ ...o, includeBranchCurrentAccount: true }));
          setBaseline({ ...base, includeBranchCurrentAccount: true });
        }
      } catch {
        // Cari çekilemezse default kapalı kalır; PDF'in kalanı etkilenmez.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branch]);

  const open = branch != null;
  const requestClose = useDirtyGuard({
    isDirty:
      seasonChoice.trim() !== "" ||
      preset !== "summary" ||
      JSON.stringify(opts) !== JSON.stringify(baseline),
    isBlocked: busy,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose,
  });

  const seasonOptions = useMemo(() => settlementSeasonYearSelectOptions(t), [t]);

  const pickPreset = (p: BranchPdfPreset) => {
    setPreset(p);
    // «Özel»: mevcut seçimler korunur, yalnızca gelişmiş seçenekler açılır.
    if (p !== "custom") setOpts(branchPdfPresetOptions(p, cariOpen));
  };
  const presetHintKey =
    preset === "summary"
      ? "branch.branchPdfPresetSummaryHint"
      : preset === "detailed"
        ? "branch.branchPdfPresetDetailedHint"
        : "branch.branchPdfPresetCustomHint";

  const run = useCallback(async () => {
    if (!branch) return;
    const yf = parseSettlementSeasonYearChoice(seasonChoice);
    if (seasonChoice.trim() !== "" && yf == null) {
      notify.error(t("personnel.effectiveYearInvalid"));
      return;
    }
    setBusy(true);
    try {
      await openPersonnelSettlementPrintWindow({
        target: {
          scope: "branch",
          branchId: branch.id,
          title: branch.name,
          ...(yf != null ? { seasonYearFilter: yf } : {}),
        },
        locale,
        branchNameById,
        t,
        branchPdfOptions: opts,
      });
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [branch, locale, branchNameById, t, opts, seasonChoice, onClose]);

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("branch.branchPdfOptionsTitle")}
      description={t("branch.branchPdfOptionsIntro")}
      closeButtonLabel={t("common.close")}
    >
      <ModalFormLayout
        className="mt-0"
        body={
          <>
            <FormSection>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3">
                <Select
                  name="branchPdfSeason"
                  label={t("personnel.settlementPrintSeasonLabel")}
                  options={seasonOptions}
                  value={seasonChoice}
                  onChange={(e) => setSeasonChoice(e.target.value)}
                  onBlur={() => {}}
                />
                <p className="mt-2 text-xs text-zinc-500">
                  {t("personnel.settlementPrintSeasonHint")}
                </p>
              </div>
            </FormSection>
            <FormSection>
              <p id="bp-preset-label" className="mb-1 text-xs font-medium text-zinc-600">
                {t("branch.branchPdfPresetLabel")}
              </p>
              <div role="radiogroup" aria-labelledby="bp-preset-label" className="flex gap-2">
                {(["summary", "detailed", "custom"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={preset === p}
                    onClick={() => pickPreset(p)}
                    className={cn(
                      "min-h-10 flex-1 rounded-lg border px-2 py-1 text-sm font-medium transition-colors",
                      preset === p
                        ? "border-violet-400 bg-violet-50 text-violet-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    {t(
                      p === "summary"
                        ? "branch.branchPdfPresetSummary"
                        : p === "detailed"
                          ? "branch.branchPdfPresetDetailed"
                          : "branch.branchPdfPresetCustom"
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">{t(presetHintKey)}</p>
            </FormSection>
            <FormSection>
              <details
                key={preset === "custom" ? "adv-open" : "adv-closed"}
                open={preset === "custom"}
                className="rounded-lg border border-zinc-200"
              >
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-zinc-700">
                  {t("branch.branchPdfAdvancedOptions")}
                </summary>
                <div className="px-2 pb-2">
                  <BranchPdfSettlementOptionsFields
                    value={opts}
                    onChange={(next) => {
                      setOpts(next);
                      setPreset("custom");
                    }}
                  />
                </div>
              </details>
            </FormSection>
          </>
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={requestClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void run()}
            >
              {t("branch.branchPdfConfirm")}
            </Button>
          </>
        }
      />
    </Modal>
  );
}
