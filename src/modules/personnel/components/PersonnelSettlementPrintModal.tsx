"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
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
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { Personnel } from "@/types/personnel";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { useCallback, useEffect, useMemo, useState } from "react";

const TITLE_ID = "settlement-print-modal-title";

type BranchRow = { id: number; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  branches: BranchRow[];
  personnelList: Personnel[];
  branchNameById: Map<number, string>;
  locale: Locale;
};

export function PersonnelSettlementPrintModal({
  open,
  onClose,
  branches,
  personnelList,
  branchNameById,
  locale,
}: Props) {
  const { t } = useI18n();
  const [scope, setScope] = useState<"personnel" | "branch">("personnel");
  const [personnelId, setPersonnelId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [branchPdfOpts, setBranchPdfOpts] = useState<BranchSettlementPdfOptions>(() =>
    defaultBranchSettlementPdfOptions()
  );
  const [seasonChoice, setSeasonChoice] = useState("");

  useEffect(() => {
    if (!open) return;
    setScope("personnel");
    setPersonnelId("");
    setBranchId("");
    setBranchPdfOpts(defaultBranchSettlementPdfOptions());
    setSeasonChoice("");
  }, [open]);

  useEffect(() => {
    if (scope === "personnel") setBranchId("");
    else setPersonnelId("");
  }, [scope]);

  const seasonOptions = useMemo(() => settlementSeasonYearSelectOptions(t), [t]);

  const personnelSelectOptions = useMemo(() => {
    const rows = personnelList
      .filter((p) => !p.isDeleted)
      .slice()
      .sort((a, b) =>
        personnelDisplayName(a).localeCompare(personnelDisplayName(b), undefined, {
          sensitivity: "base",
        })
      );
    return [
      { value: "", label: t("personnel.settlementPrintPickPersonnel") },
      ...rows.map((p) => ({
        value: String(p.id),
        label: personnelDisplayName(p),
      })),
    ];
  }, [personnelList, t]);

  const branchSelectOptions = useMemo(
    () => [
      { value: "", label: t("personnel.settlementPrintPickBranch") },
      ...[...branches]
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        )
        .map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const runPrint = useCallback(async () => {
    const yf = parseSettlementSeasonYearChoice(seasonChoice);
    if (seasonChoice.trim() !== "" && yf == null) {
      notify.error(t("personnel.effectiveYearInvalid"));
      return;
    }
    const seasonPart =
      yf != null ? ({ seasonYearFilter: yf } as const) : ({} as const);

    if (scope === "personnel") {
      const pid = parseInt(personnelId, 10);
      if (!Number.isFinite(pid) || pid <= 0) {
        notify.error(t("personnel.settlementPrintNeedPerson"));
        return;
      }
      const name =
        personnelSelectOptions.find((o) => o.value === personnelId)?.label?.trim() ||
        `#${pid}`;
      const pRow = personnelList.find((x) => x.id === pid);
      setBusy(true);
      try {
        await openPersonnelSettlementPrintWindow({
          target: {
            scope: "personnel",
            personnelId: pid,
            title: name,
            seasonArrivalDate: pRow?.seasonArrivalDate ?? null,
            ...seasonPart,
          },
          locale,
          branchNameById,
          t,
        });
        onClose();
      } catch (e) {
        notify.error(toErrorMessage(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    const bid = parseInt(branchId, 10);
    if (!Number.isFinite(bid) || bid <= 0) {
      notify.error(t("personnel.settlementPrintNeedBranch"));
      return;
    }
    const bname =
      branchSelectOptions.find((o) => o.value === branchId)?.label?.trim() ||
      `#${bid}`;
    setBusy(true);
    try {
      await openPersonnelSettlementPrintWindow({
        target: { scope: "branch", branchId: bid, title: bname, ...seasonPart },
        locale,
        branchNameById,
        t,
        branchPdfOptions: branchPdfOpts,
      });
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [
    scope,
    personnelId,
    branchId,
    seasonChoice,
    personnelList,
    personnelSelectOptions,
    branchSelectOptions,
    branchPdfOpts,
    locale,
    branchNameById,
    t,
    onClose,
  ]);

  const scopeBtn = (active: boolean) =>
    cn(
      "min-h-12 flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors sm:min-h-11",
      active
        ? "border-violet-300 bg-violet-50 text-violet-900"
        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("personnel.settlementPrintModalTitle")}
      description={t("personnel.settlementPrintModalIntro")}
      closeButtonLabel={t("common.close")}
      narrow
    >
      <div className="space-y-4 px-4 pb-4 pt-1">
        <div>
          <p
            id={`${TITLE_ID}-scope`}
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"
          >
            {t("personnel.settlementPrintModalScopeHint")}
          </p>
          <div
            role="radiogroup"
            aria-labelledby={`${TITLE_ID}-scope`}
            className="flex gap-2"
          >
            <button
              type="button"
              role="radio"
              aria-checked={scope === "personnel"}
              className={scopeBtn(scope === "personnel")}
              onClick={() => setScope("personnel")}
            >
              {t("personnel.settlementPrintModePersonnel")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={scope === "branch"}
              className={scopeBtn(scope === "branch")}
              onClick={() => setScope("branch")}
            >
              {t("personnel.settlementPrintModeBranch")}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3">
          <Select
            name="settlementPrintSeason"
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

        {scope === "personnel" ? (
          <Select
            name="settlementPrintPersonnel"
            label={t("personnel.settlementPrintModalSelectPerson")}
            labelRequired
            options={personnelSelectOptions}
            value={personnelId}
            onChange={(e) => setPersonnelId(e.target.value)}
            onBlur={() => {}}
          />
        ) : (
          <>
            <Select
              name="settlementPrintBranch"
              label={t("personnel.settlementPrintModalSelectBranch")}
              labelRequired
              options={branchSelectOptions}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              onBlur={() => {}}
            />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("branch.branchPdfOptionsTitle")}
              </p>
              <BranchPdfSettlementOptionsFields
                value={branchPdfOpts}
                onChange={setBranchPdfOpts}
              />
            </div>
          </>
        )}

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
            onClick={() => void runPrint()}
          >
            {t("personnel.settlementPrintModalConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
