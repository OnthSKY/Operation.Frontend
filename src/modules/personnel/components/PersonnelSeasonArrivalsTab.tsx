"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import {
  useCreatePersonnelEmploymentTerm,
  useDeletePersonnelEmploymentTerm,
  useDeleteOpenPersonnelEmploymentTerm,
  usePersonnelEmploymentTerms,
  useUpdatePersonnelEmploymentTerm,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { PencilIcon } from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import type {
  CreatePersonnelEmploymentTermBody,
  PersonnelEmploymentTerm,
  UpdatePersonnelEmploymentTermBody,
} from "@/types/personnel-account-closure";
import { useEffect, useMemo, useState } from "react";

function buildUpdateBody(
  term: PersonnelEmploymentTerm,
  arrivalDate: string,
  clearArrivalDate: boolean = false
): UpdatePersonnelEmploymentTermBody {
  return {
    validFrom: term.validFrom.slice(0, 10),
    arrivalDate: arrivalDate.slice(0, 10),
    clearArrivalDate,
    branchId: term.branchId,
    salary: term.salary,
    currencyCode: term.currencyCode,
    salaryType: term.salaryType,
    employmentType: term.employmentType,
    isManualEmployerCostOverride: term.isManualEmployerCostOverride,
    manualTotalEmployerCost: term.manualTotalEmployerCost,
    manualOverrideNote: term.manualOverrideNote,
  };
}

function buildCreateBody(
  open: PersonnelEmploymentTerm,
  validFrom: string,
  arrivalDate: string
): CreatePersonnelEmploymentTermBody {
  return {
    validFrom: validFrom.slice(0, 10),
    arrivalDate: arrivalDate.slice(0, 10),
    branchId: open.branchId,
    salary: open.salary,
    currencyCode: open.currencyCode,
    salaryType: open.salaryType,
    employmentType: open.employmentType,
    isManualEmployerCostOverride: open.isManualEmployerCostOverride,
    manualTotalEmployerCost: open.manualTotalEmployerCost ?? undefined,
    manualOverrideNote: open.manualOverrideNote ?? undefined,
  };
}

function formatIso(iso: string, locale: Locale, dash: string): string {
  const s = String(iso ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return dash;
  return formatLocaleDate(s, locale, dash);
}

export type PersonnelSeasonArrivalsTabProps = {
  personnelId: number;
  active: boolean;
  readOnly: boolean;
  branchNameById: Map<number, string>;
};

export function PersonnelSeasonArrivalsTab({
  personnelId,
  active,
  readOnly,
  branchNameById,
}: PersonnelSeasonArrivalsTabProps) {
  const { t, locale } = useI18n();
  const dash = t("personnel.dash");
  const { data: terms = [], isPending, isError, error, refetch } =
    usePersonnelEmploymentTerms(personnelId, active && personnelId > 0);
  const createMut = useCreatePersonnelEmploymentTerm(personnelId);
  const updateMut = useUpdatePersonnelEmploymentTerm(personnelId);
  const deleteOpenMut = useDeleteOpenPersonnelEmploymentTerm(personnelId);
  const deleteMut = useDeletePersonnelEmploymentTerm(personnelId);

  const openTerm = useMemo(
    () => terms.find((r) => r.isOpen) ?? null,
    [terms]
  );
  const hasPredecessor = terms.some((r) => !r.isOpen);

  const [arrivalDraft, setArrivalDraft] = useState("");
  useEffect(() => {
    if (openTerm) setArrivalDraft(openTerm.arrivalDate.slice(0, 10));
  }, [openTerm?.id, openTerm?.arrivalDate]);

  const [newValidFrom, setNewValidFrom] = useState("");
  const [newArrivalDate, setNewArrivalDate] = useState(() => localIsoDate());
  const [editingTermId, setEditingTermId] = useState<number | null>(null);
  const [editingArrivalDraft, setEditingArrivalDraft] = useState("");

  const arrivalDirty =
    openTerm != null &&
    arrivalDraft.trim() !== openTerm.arrivalDate.slice(0, 10);

  const sortedTerms = useMemo(() => {
    return [...terms].sort((a, b) => {
      const va = a.validFrom.slice(0, 10);
      const vb = b.validFrom.slice(0, 10);
      if (va !== vb) return vb.localeCompare(va);
      return b.id - a.id;
    });
  }, [terms]);

  const onSaveOpenArrival = async () => {
    if (readOnly || !openTerm) return;
    const ad = arrivalDraft.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ad)) {
      notify.error(t("personnel.seasonArrivalsInvalidDate"));
      return;
    }
    try {
      await updateMut.mutateAsync({
        termId: openTerm.id,
        body: buildUpdateBody(openTerm, ad),
      });
      notify.success(t("personnel.seasonArrivalsSaveSuccess"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onClearOpenArrival = async () => {
    if (readOnly || !openTerm) return;
    try {
      await updateMut.mutateAsync({
        termId: openTerm.id,
        body: buildUpdateBody(openTerm, openTerm.validFrom, true),
      });
      notify.success(t("personnel.seasonArrivalsClearSuccess"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onAddTerm = async () => {
    if (readOnly || !openTerm) return;
    const vf = newValidFrom.trim().slice(0, 10);
    const ad = newArrivalDate.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vf) || !/^\d{4}-\d{2}-\d{2}$/.test(ad)) {
      notify.error(t("personnel.seasonArrivalsInvalidDate"));
      return;
    }
    try {
      await createMut.mutateAsync(buildCreateBody(openTerm, vf, ad));
      notify.success(t("personnel.seasonArrivalsAddSuccess"));
      setNewValidFrom("");
      setNewArrivalDate(localIsoDate());
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onRevertOpenTerm = () => {
    if (readOnly || !openTerm || !hasPredecessor) return;
    notifyConfirmToast({
      toastId: `personnel-salary-term-revert-${personnelId}`,
      title: t("personnel.seasonArrivalsRevertConfirmTitle"),
      message: t("personnel.seasonArrivalsRevertConfirmMessage"),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("personnel.seasonArrivalsRevertConfirm"),
      onConfirm: async () => {
        try {
          await deleteOpenMut.mutateAsync();
          notify.success(t("personnel.seasonArrivalsRevertSuccess"));
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });
  };

  const onStartRowEdit = (row: PersonnelEmploymentTerm) => {
    if (readOnly) return;
    setEditingTermId(row.id);
    setEditingArrivalDraft(row.arrivalDate.slice(0, 10));
  };

  const onCancelRowEdit = () => {
    setEditingTermId(null);
    setEditingArrivalDraft("");
  };

  const onSaveRowEdit = async (row: PersonnelEmploymentTerm) => {
    if (readOnly) return;
    const ad = editingArrivalDraft.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ad)) {
      notify.error(t("personnel.seasonArrivalsInvalidDate"));
      return;
    }
    try {
      await updateMut.mutateAsync({
        termId: row.id,
        body: buildUpdateBody(row, ad),
      });
      notify.success(t("personnel.seasonArrivalsSaveSuccess"));
      onCancelRowEdit();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onDeleteRow = (row: PersonnelEmploymentTerm) => {
    if (readOnly) return;
    notifyConfirmToast({
      toastId: `personnel-season-arrival-delete-${personnelId}-${row.id}`,
      title: t("personnel.seasonArrivalsDeleteConfirmTitle"),
      message: t("personnel.seasonArrivalsDeleteConfirmMessage"),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(row.id);
          notify.success(t("personnel.seasonArrivalsDeleteSuccess"));
          if (editingTermId === row.id) onCancelRowEdit();
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });
  };

  return (
    <div className="space-y-4 pb-2">
      <article className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("personnel.seasonArrivalsTitle")}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
          {t("personnel.seasonArrivalsIntro")}
        </p>

        {isPending ? (
          <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : null}
        {isError ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
            <Button type="button" variant="secondary" className="min-h-[44px] min-w-[44px]" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : null}

        {!isPending && !isError ? (
          <div className="mt-4 min-w-0">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("personnel.seasonArrivalsColArrival")}</TableHeader>
                  <TableHeader>{t("personnel.seasonArrivalsColValidFrom")}</TableHeader>
                  <TableHeader>{t("personnel.seasonArrivalsColValidTo")}</TableHeader>
                  <TableHeader>{t("personnel.seasonArrivalsColStatus")}</TableHeader>
                  <TableHeader className="w-[1%] whitespace-nowrap text-right">
                    {t("personnel.seasonArrivalsColActions")}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedTerms.map((row) => {
                  const isOpen = row.isOpen;
                  const rowEditing = editingTermId === row.id;
                  return (
                    <TableRow key={row.id}>
                      <TableCell
                        dataLabel={t("personnel.seasonArrivalsColArrival")}
                        className="align-middle"
                      >
                        {isOpen && !readOnly ? (
                          <DateField
                            mode="date"
                            className="w-full max-w-[11rem] max-md:max-w-none"
                            value={arrivalDraft}
                            onChange={(e) => setArrivalDraft(e.target.value)}
                            disabled={updateMut.isPending}
                          />
                        ) : rowEditing && !readOnly ? (
                          <DateField
                            mode="date"
                            className="w-full max-w-[11rem] max-md:max-w-none"
                            value={editingArrivalDraft}
                            onChange={(e) => setEditingArrivalDraft(e.target.value)}
                            disabled={updateMut.isPending}
                          />
                        ) : (
                          <span className="font-medium tabular-nums text-zinc-900">
                            {formatIso(row.arrivalDate, locale, dash)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        dataLabel={t("personnel.seasonArrivalsColValidFrom")}
                        className="tabular-nums text-zinc-800"
                      >
                        {formatIso(row.validFrom, locale, dash)}
                      </TableCell>
                      <TableCell
                        dataLabel={t("personnel.seasonArrivalsColValidTo")}
                        className="tabular-nums text-zinc-700"
                      >
                        {row.validTo
                          ? formatIso(row.validTo, locale, dash)
                          : t("personnel.seasonArrivalsOpenEnded")}
                      </TableCell>
                      <TableCell dataLabel={t("personnel.seasonArrivalsColStatus")}>
                        <span
                          className={
                            isOpen
                              ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900"
                              : "inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700"
                          }
                        >
                          {isOpen
                            ? t("personnel.seasonArrivalsStatusOpen")
                            : t("personnel.seasonArrivalsStatusClosed")}
                        </span>
                      </TableCell>
                      <TableCell
                        dataLabel={t("personnel.seasonArrivalsColActions")}
                        className="text-right align-middle max-md:text-left"
                      >
                        {!readOnly ? (
                          <div className="flex flex-wrap justify-end gap-1.5 max-md:w-full max-md:flex-col max-md:items-stretch">
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-[44px] min-w-[44px] max-md:w-full"
                              disabled={
                                isOpen
                                  ? (!arrivalDirty || updateMut.isPending)
                                  : (rowEditing
                                      ? (editingArrivalDraft.slice(0, 10) === row.arrivalDate.slice(0, 10) ||
                                        updateMut.isPending)
                                      : updateMut.isPending || deleteMut.isPending || deleteOpenMut.isPending)
                              }
                              onClick={() =>
                                void (isOpen
                                  ? onSaveOpenArrival()
                                  : rowEditing
                                    ? onSaveRowEdit(row)
                                    : Promise.resolve(onStartRowEdit(row)))
                              }
                            >
                              {isOpen
                                ? t("personnel.seasonArrivalsSaveArrival")
                                : rowEditing
                                  ? t("common.save")
                                  : t("personnel.seasonArrivalsRowEdit")}
                            </Button>
                            {isOpen ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-[44px] min-w-[44px] max-md:w-full"
                                disabled={
                                  updateMut.isPending ||
                                  arrivalDraft.slice(0, 10) === row.validFrom.slice(0, 10)
                                }
                                onClick={() => void onClearOpenArrival()}
                              >
                                {t("personnel.seasonArrivalsClearArrival")}
                              </Button>
                            ) : rowEditing ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-[44px] min-w-[44px] max-md:w-full"
                                disabled={updateMut.isPending}
                                onClick={onCancelRowEdit}
                              >
                                {t("common.cancel")}
                              </Button>
                            ) : null}
                            <button
                              type="button"
                              className={`${trashIconActionButtonClass} max-md:w-full max-md:justify-center`}
                              disabled={
                                isOpen
                                  ? (!hasPredecessor || deleteOpenMut.isPending || deleteMut.isPending)
                                  : (deleteMut.isPending || deleteOpenMut.isPending || updateMut.isPending)
                              }
                              title={
                                isOpen
                                  ? (!hasPredecessor
                                      ? t("personnel.seasonArrivalsRevertBlockedSingleTerm")
                                      : t("personnel.seasonArrivalsRevertTooltip"))
                                  : t("personnel.seasonArrivalsDeleteTooltip")
                              }
                              aria-label={
                                isOpen
                                  ? t("personnel.seasonArrivalsRevertTooltip")
                                  : t("personnel.seasonArrivalsDeleteTooltip")
                              }
                              onClick={() => (isOpen ? onRevertOpenTerm() : onDeleteRow(row))}
                            >
                              <TrashIcon />
                            </button>
                            {!isOpen && !rowEditing ? (
                              <button
                                type="button"
                                className={`${trashIconActionButtonClass} border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 max-md:w-full max-md:justify-center`}
                                disabled={updateMut.isPending || deleteMut.isPending || deleteOpenMut.isPending}
                                title={t("personnel.seasonArrivalsRowEdit")}
                                aria-label={t("personnel.seasonArrivalsRowEdit")}
                                onClick={() => onStartRowEdit(row)}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </article>

      {!readOnly && openTerm ? (
        <article className="rounded-2xl border border-sky-200/80 bg-sky-50/30 p-4 shadow-sm sm:p-5">
          <h4 className="text-sm font-semibold text-zinc-900">
            {t("personnel.seasonArrivalsAddSectionTitle")}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            {t("personnel.seasonArrivalsAddHint").replace(
              "{date}",
              formatIso(openTerm.validFrom, locale, dash)
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3 max-md:gap-2">
            <div className="min-w-[10rem] flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                {t("personnel.seasonArrivalsNewValidFrom")}
              </label>
              <DateField
                mode="date"
                value={newValidFrom}
                onChange={(e) => setNewValidFrom(e.target.value)}
                disabled={createMut.isPending}
              />
            </div>
            <div className="min-w-[10rem] flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                {t("personnel.seasonArrivalsNewArrival")}
              </label>
              <DateField
                mode="date"
                value={newArrivalDate}
                onChange={(e) => setNewArrivalDate(e.target.value)}
                disabled={createMut.isPending}
              />
            </div>
            <Button
              type="button"
              className="min-h-[44px] min-w-[44px] max-md:w-full"
              disabled={createMut.isPending || newValidFrom.trim() === ""}
              onClick={() => void onAddTerm()}
            >
              {t("personnel.seasonArrivalsAddSubmit")}
            </Button>
          </div>
          <p className="mt-2 text-[0.7rem] text-zinc-500">
            {openTerm.branchId != null && openTerm.branchId > 0
              ? t("personnel.seasonArrivalsSalaryCarryNoteWithBranch").replace(
                  "{branch}",
                  branchNameById.get(openTerm.branchId) ?? `#${openTerm.branchId}`
                )
              : t("personnel.seasonArrivalsSalaryCarryNote")}
          </p>
        </article>
      ) : null}
    </div>
  );
}
