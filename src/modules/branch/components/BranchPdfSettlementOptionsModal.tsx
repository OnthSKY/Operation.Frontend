"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { BranchPdfSettlementOptionsFields } from "@/modules/branch/components/BranchPdfSettlementOptionsFields";
import {
  defaultBranchSettlementPdfOptions,
  type BranchSettlementPdfOptions,
  openPersonnelSettlementPrintWindow,
} from "@/modules/personnel/lib/personnel-settlement-print";
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

  useEffect(() => {
    if (branch) {
      setOpts(defaultBranchSettlementPdfOptions());
      setSeasonChoice("");
    }
  }, [branch]);

  const open = branch != null;
  const requestClose = useDirtyGuard({
    isDirty:
      seasonChoice.trim() !== "" ||
      JSON.stringify(opts) !== JSON.stringify(defaultBranchSettlementPdfOptions()),
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
