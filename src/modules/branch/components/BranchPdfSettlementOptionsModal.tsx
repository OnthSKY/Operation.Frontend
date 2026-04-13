"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { BranchPdfSettlementOptionsFields } from "@/modules/branch/components/BranchPdfSettlementOptionsFields";
import {
  defaultBranchSettlementPdfOptions,
  type BranchSettlementPdfOptions,
  openPersonnelSettlementPrintWindow,
} from "@/modules/personnel/lib/personnel-settlement-print";
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
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("branch.branchPdfOptionsTitle")}
      description={t("branch.branchPdfOptionsIntro")}
      closeButtonLabel={t("common.close")}
    >
      <div className="space-y-4 px-4 pb-4 pt-1">
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
        <BranchPdfSettlementOptionsFields value={opts} onChange={setOpts} />
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={onClose}
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
        </div>
      </div>
    </Modal>
  );
}
