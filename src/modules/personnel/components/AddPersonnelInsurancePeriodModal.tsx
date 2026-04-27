"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useAddPersonnelInsurancePeriod } from "@/modules/personnel/hooks/usePersonnelQueries";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useEffect, useMemo, useState } from "react";

function IconShieldPerson({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.5 16.5c1-1.2 2.2-1.8 3.5-1.8s2.5.6 3.5 1.8" />
    </svg>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  personnelId: number;
  /** Güncel açık dönem `seasonArrivalDate`; yoksa sigorta dönemi eklenemez. */
  seasonArrivalDate?: string | null;
  /** Varsayılan seçili şube (ör. personelin atanmış şubesi) */
  defaultBranchId?: number | null;
  /** Liste / detaydan gelen görünen ad (üst bilgi kartı). */
  personnelDisplayName?: string | null;
  /** Engelde kullanıcıyı sezon gelişi sekmesine yönlendirir. */
  onNavigateSeasonArrivals?: () => void;
};

export function AddPersonnelInsurancePeriodModal({
  open,
  onClose,
  personnelId,
  seasonArrivalDate,
  defaultBranchId,
  personnelDisplayName,
  onNavigateSeasonArrivals,
}: Props) {
  const { t } = useI18n();
  const mut = useAddPersonnelInsurancePeriod();
  const { data: branches = [] } = useBranchesList();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [branchId, setBranchId] = useState("");

  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("personnel.insuranceAddPeriodBranchPlaceholder") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  useEffect(() => {
    if (!open) {
      setStart("");
      setEnd("");
      setNotes("");
      setBranchId("");
      return;
    }
    setStart(localIsoDate());
    setEnd("");
    setNotes("");
    setBranchId(
      defaultBranchId != null && defaultBranchId > 0
        ? String(defaultBranchId)
        : ""
    );
  }, [open, personnelId, defaultBranchId]);

  const seasonArrivalMissing =
    seasonArrivalDate == null ||
    (typeof seasonArrivalDate === "string" && seasonArrivalDate.trim() === "");
  const startIso = start.trim();
  const endIso = end.trim();
  const branchIdValue = parseInt(branchId.trim(), 10);
  const hasValidBranch = Number.isFinite(branchIdValue) && branchIdValue > 0;
  const hasValidStart = /^\d{4}-\d{2}-\d{2}$/.test(startIso);
  const hasValidEnd = endIso === "" || /^\d{4}-\d{2}-\d{2}$/.test(endIso);
  const hasDateOrderError = hasValidStart && hasValidEnd && endIso !== "" && endIso < startIso;
  const saveBlockedReason = mut.isPending
    ? null
    : seasonArrivalMissing
      ? t("personnel.insuranceAddPeriodSaveBlockedSeasonArrival")
      : !hasValidBranch
        ? t("personnel.insuranceAddPeriodSaveBlockedBranch")
        : !hasValidStart
          ? t("personnel.insuranceAddPeriodSaveBlockedStartDate")
          : !hasValidEnd
            ? t("personnel.insuranceAddPeriodSaveBlockedEndDate")
            : hasDateOrderError
              ? t("personnel.insuranceAddPeriodSaveBlockedDateOrder")
              : null;
  const isSaveDisabled = mut.isPending || saveBlockedReason != null;

  const submit = async () => {
    if (saveBlockedReason != null) {
      notify.error(saveBlockedReason);
      return;
    }
    const registeredBranchId = branchIdValue;
    try {
      await mut.mutateAsync({
        personnelId,
        input: {
          coverageStartDate: startIso,
          coverageEndDate: endIso === "" ? null : endIso,
          notes: notes.trim() !== "" ? notes.trim() : null,
          registeredBranchId,
        },
      });
      notify.success(t("personnel.insurancePeriodSaved"));
      onClose();
    } catch (err) {
      notify.error(toErrorMessage(err));
    }
  };

  const nameChip =
    typeof personnelDisplayName === "string" && personnelDisplayName.trim() !== ""
      ? personnelDisplayName.trim()
      : null;
  const isDirty =
    start.trim() !== "" ||
    end.trim() !== "" ||
    notes.trim() !== "" ||
    branchId.trim() !== "";
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: mut.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  return (
    <Modal
      open={open}
      onClose={requestClose}
      narrow
      titleId="add-insurance-period-title"
      title={t("personnel.insuranceAddPeriodTitle")}
      description={t("personnel.insuranceAddPeriodHint")}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <ModalFormLayout
          body={
            <>
              <FormSection>
                {seasonArrivalMissing ? (
                  <div
                    className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm"
                    role="alert"
                  >
                    <p>{t("personnel.insuranceAddPeriodSeasonArrivalBlocked")}</p>
                    {onNavigateSeasonArrivals ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-3 min-h-9 border-amber-300/80 bg-white/80 text-amber-900 hover:bg-amber-100"
                        onClick={onNavigateSeasonArrivals}
                      >
                        {t("personnel.insuranceAddPeriodGoSeasonArrivals")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {nameChip ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 via-white to-sky-50/40 p-3 shadow-sm ring-1 ring-emerald-900/[0.04]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <IconShieldPerson className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90">
                        {t("personnel.insuranceIntakeModalPersonCaption")}
                      </p>
                      <p className="truncate text-sm font-semibold text-zinc-900">{nameChip}</p>
                    </div>
                  </div>
                ) : null}
              </FormSection>
              <FormSection>
                <Select
                  label={t("personnel.insuranceAddPeriodBranchLabel")}
                  labelRequired
                  name="insurance-period-branch"
                  options={branchOptions}
                  value={branchId}
                  onChange={(ev) => setBranchId(ev.target.value)}
                  onBlur={() => {}}
                />
                <p className="-mt-1 text-xs text-zinc-500">{t("personnel.insuranceAddPeriodBranchHint")}</p>
                <DateField
                  label={t("personnel.insuranceAddPeriodStartLabel")}
                  labelRequired
                  required
                  value={start}
                  onChange={(ev) => setStart(ev.target.value)}
                />
                <DateField
                  label={t("personnel.insuranceAddPeriodEndOptional")}
                  value={end}
                  onChange={(ev) => setEnd(ev.target.value)}
                />
                <p className="text-xs text-zinc-500">{t("personnel.insuranceAddPeriodEndHelp")}</p>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ins-period-notes" className="text-sm font-medium text-zinc-800">
                    {t("personnel.fieldInsurancePrerequisiteNotes")}
                  </label>
                  <textarea
                    id="ins-period-notes"
                    className="min-h-[88px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                    rows={3}
                    value={notes}
                    onChange={(ev) => setNotes(ev.target.value)}
                    autoComplete="off"
                  />
                </div>
                {saveBlockedReason ? (
                  <p className="text-xs leading-relaxed text-amber-700" role="status" aria-live="polite">
                    {saveBlockedReason}
                  </p>
                ) : null}
              </FormSection>
            </>
          }
          footer={
            <>
              <Button type="button" variant="secondary" onClick={requestClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={isSaveDisabled}>
                {mut.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </>
          }
        />
      </form>
    </Modal>
  );
}
