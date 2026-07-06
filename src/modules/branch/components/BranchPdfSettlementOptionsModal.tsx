"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { BranchPdfSettlementOptionsFields } from "@/modules/branch/components/BranchPdfSettlementOptionsFields";
import {
  defaultBranchSettlementPdfOptions,
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
  const [opts, setOpts] = useState<BranchSettlementPdfOptions>(() =>
    defaultBranchSettlementPdfOptions()
  );
  const [busy, setBusy] = useState(false);
  const [seasonChoice, setSeasonChoice] = useState("");
  // Cari toggle her zaman görünür (eklemeyi sorar). Açık bakiye (cari borç) varsa
  // default açık; yoksa kapalı. baseline = otomatik-ayarlı kirlilik tabanı.
  const [baseline, setBaseline] = useState<BranchSettlementPdfOptions>(() =>
    defaultBranchSettlementPdfOptions()
  );

  useEffect(() => {
    if (!branch) return;
    const base = defaultBranchSettlementPdfOptions();
    setOpts(base);
    setBaseline(base);
    setSeasonChoice("");
    let cancelled = false;
    void (async () => {
      try {
        const all = await fetchOutboundInvoices();
        if (cancelled) return;
        const openSum = all
          .filter((i) => i.counterpartyType === "branch" && i.counterpartyId === branch.id)
          .reduce((s, i) => s + (Number(i.openAmount) || 0), 0);
        if (openSum > 0.009) {
          const next = { ...base, includeBranchCurrentAccount: true };
          setOpts(next);
          setBaseline(next);
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
      JSON.stringify(opts) !== JSON.stringify(baseline),
    isBlocked: busy,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose,
  });

  const seasonOptions = useMemo(() => settlementSeasonYearSelectOptions(t), [t]);

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
              <BranchPdfSettlementOptionsFields value={opts} onChange={setOpts} />
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
