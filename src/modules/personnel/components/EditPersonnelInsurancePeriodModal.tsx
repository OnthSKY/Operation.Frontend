"use client";

import { useI18n } from "@/i18n/context";
import { useUpdatePersonnelInsurancePeriod } from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Modal } from "@/shared/ui/Modal";
import type { PersonnelInsurancePeriod } from "@/types/personnel";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  personnelId: number;
  period: PersonnelInsurancePeriod | null;
  personnelDisplayName?: string | null;
};

export function EditPersonnelInsurancePeriodModal({
  open,
  onClose,
  personnelId,
  period,
  personnelDisplayName,
}: Props) {
  const { t } = useI18n();
  const mut = useUpdatePersonnelInsurancePeriod();
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !period) {
      setEnd("");
      setNotes("");
      return;
    }
    const e = period.coverageEndDate?.trim() ?? "";
    setEnd(/^\d{4}-\d{2}-\d{2}$/.test(e) ? e : "");
    setNotes(period.notes?.trim() ?? "");
  }, [open, period]);

  const submit = async () => {
    if (!period) return;
    const e = end.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e)) {
      notify.error(t("common.required"));
      return;
    }
    const start = period.coverageStartDate.slice(0, 10);
    if (e < start) {
      notify.error(t("personnel.insuranceDateOrderInvalid"));
      return;
    }
    try {
      await mut.mutateAsync({
        personnelId,
        periodId: period.id,
        input: {
          coverageEndDate: e,
          notes: notes.trim() === "" ? null : notes.trim(),
        },
      });
      notify.success(t("personnel.insurancePeriodUpdated"));
      onClose();
    } catch (err) {
      notify.error(toErrorMessage(err));
    }
  };

  const nameChip =
    typeof personnelDisplayName === "string" && personnelDisplayName.trim() !== ""
      ? personnelDisplayName.trim()
      : null;

  const isOpenPeriod =
    period != null &&
    (period.coverageEndDate == null || String(period.coverageEndDate).trim() === "");

  const title = isOpenPeriod
    ? t("personnel.insuranceClosePeriodTitle")
    : t("personnel.insuranceEditPeriodTitle");

  if (!period) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      narrow
      titleId="edit-insurance-period-title"
      title={title}
      description={t("personnel.insuranceEditPeriodHint")}
      closeButtonLabel={t("common.close")}
    >
      <div className="mt-4 flex flex-col gap-4">
        {nameChip ? (
          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("personnel.insuranceIntakeModalPersonCaption")}
            </p>
            <p className="truncate text-sm font-semibold text-zinc-900">{nameChip}</p>
          </div>
        ) : null}

        <div className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-xs text-zinc-600">
          <span className="font-medium text-zinc-700">
            {t("personnel.insuranceAddPeriodStartLabel")}:{" "}
          </span>
          <span className="font-mono text-zinc-900">
            {period.coverageStartDate.slice(0, 10)}
          </span>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-4 sm:p-5">
          <DateField
            label={t("personnel.insuranceEditPeriodEndLabel")}
            labelRequired
            required
            value={end}
            onChange={(ev) => setEnd(ev.target.value)}
          />
          <p className="-mt-2 text-xs text-zinc-500">
            {t("personnel.insuranceEditPeriodEndHelp")}
          </p>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-ins-period-notes"
              className="text-sm font-medium text-zinc-800"
            >
              {t("personnel.fieldInsurancePrerequisiteNotes")}
            </label>
            <textarea
              id="edit-ins-period-notes"
              className="min-h-[88px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
              rows={3}
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              autoComplete="off"
              placeholder={t("personnel.insuranceEditPeriodNotesPlaceholder")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={mut.isPending}
            onClick={() => void submit()}
          >
            {mut.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
