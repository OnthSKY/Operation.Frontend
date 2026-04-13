"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import {
  useBranchTourismSeasonPeriods,
  useBranchTourismSeasonYearClosureGate,
  useCreateBranchTourismSeasonPeriod,
  useDeleteBranchTourismSeasonPeriod,
  useUpdateBranchTourismSeasonPeriod,
} from "@/modules/branch/hooks/useBranchQueries";
import type { BranchTourismSeasonPeriod } from "@/types/branch-tourism-season";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Card } from "@/shared/components/Card";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useMemo, useState } from "react";

const FORM_MODAL_TITLE_ID = "branch-tourism-season-form-title";

type Props = { branchId: number; active: boolean };

export function BranchTourismSeasonTab({ branchId, active }: Props) {
  const { t, locale } = useI18n();
  const [yearFilter, setYearFilter] = useState("");
  const effectiveYear = useMemo(() => {
    const s = yearFilter.trim();
    if (!s) return undefined;
    const n = parseInt(s, 10);
    if (!Number.isFinite(n) || n < 1990 || n > 2100) return undefined;
    return n;
  }, [yearFilter]);
  const yearInvalid = yearFilter.trim().length > 0 && effectiveYear === undefined;

  const { data = [], isPending, isError, error, refetch } = useBranchTourismSeasonPeriods(
    branchId,
    effectiveYear,
    active
  );

  const createMut = useCreateBranchTourismSeasonPeriod(branchId);
  const updateMut = useUpdateBranchTourismSeasonPeriod(branchId);
  const deleteMut = useDeleteBranchTourismSeasonPeriod(branchId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BranchTourismSeasonPeriod | null>(null);
  const [seasonYear, setSeasonYear] = useState("");
  const [openedOn, setOpenedOn] = useState("");
  const [closedOn, setClosedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const formSeasonYearParsed = useMemo(() => {
    const n = parseInt(seasonYear.trim(), 10);
    if (!Number.isFinite(n) || n < 1990 || n > 2100) return null;
    return n;
  }, [seasonYear]);

  const priorYearGateApplies = formSeasonYearParsed != null && formSeasonYearParsed >= 1991;

  const yearClosureGateQuery = useBranchTourismSeasonYearClosureGate(
    branchId,
    formSeasonYearParsed,
    formOpen && !editing && priorYearGateApplies
  );

  const yearClosureBlockers = yearClosureGateQuery.data?.blockers ?? [];
  const createSaveBlockedByYearClosure =
    !editing &&
    priorYearGateApplies &&
    !yearClosureGateQuery.isError &&
    (yearClosureGateQuery.isPending ||
      yearClosureGateQuery.isFetching ||
      yearClosureBlockers.length > 0);

  const openCreate = () => {
    setEditing(null);
    setSeasonYear(String(new Date().getFullYear()));
    setOpenedOn("");
    setClosedOn("");
    setNotes("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (row: BranchTourismSeasonPeriod) => {
    setEditing(row);
    setSeasonYear(String(row.seasonYear));
    setOpenedOn(row.openedOn.slice(0, 10));
    setClosedOn(row.closedOn ? row.closedOn.slice(0, 10) : "");
    setNotes(row.notes ?? "");
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const submitForm = async () => {
    setFormError(null);
    const y = parseInt(seasonYear.trim(), 10);
    if (!Number.isFinite(y) || y < 1990 || y > 2100) {
      setFormError(t("branch.tSeasonYearInvalid"));
      return;
    }
    if (!openedOn || openedOn.length !== 10) {
      setFormError(t("branch.tSeasonOpenedInvalid"));
      return;
    }
    const closedVal = closedOn.trim().length === 10 ? closedOn.trim() : null;
    if (closedVal && closedVal < openedOn) {
      setFormError(t("branch.tSeasonClosedBeforeOpen"));
      return;
    }
    const body = {
      seasonYear: y,
      openedOn,
      closedOn: closedVal,
      notes: notes.trim() ? notes.trim() : null,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ periodId: editing.id, body });
        notify.success(t("toast.branchTSeasonUpdated"));
      } else {
        await createMut.mutateAsync(body);
        notify.success(t("toast.branchTSeasonSaved"));
      }
      closeForm();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onConfirmDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync(id);
      notify.success(t("toast.branchTSeasonDeleted"));
      setDeleteId(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  const dash = "—";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">{t("branch.tSeasonHint")}</p>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[10rem] flex-1 sm:max-w-xs">
          <Input
            name="tSeasonYearFilter"
            type="number"
            inputMode="numeric"
            min={1990}
            max={2100}
            label={t("branch.tSeasonFilterYear")}
            placeholder={t("branch.tSeasonFilterYearPh")}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          />
        </div>
        {yearInvalid ? (
          <p className="text-sm text-amber-800">{t("branch.tSeasonFilterYearInvalid")}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => setYearFilter("")}>
            {t("branch.tSeasonFilterAllYears")}
          </Button>
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => void refetch()}>
            {t("branch.filterApplyRefresh")}
          </Button>
          <Button type="button" className="min-h-11" onClick={openCreate}>
            {t("branch.tSeasonAdd")}
          </Button>
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
      ) : null}
      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !isError && data.length === 0 ? (
        <p className="text-sm text-zinc-600">{t("branch.tSeasonEmpty")}</p>
      ) : !isError ? (
        <>
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white sm:hidden">
            {data.map((row) => (
              <li key={row.id} className="px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {row.seasonYear}{" "}
                      <span className="font-normal text-zinc-500">
                        · {formatLocaleDate(row.openedOn, locale)}
                        {row.closedOn
                          ? ` → ${formatLocaleDate(row.closedOn, locale)}`
                          : ` · ${t("branch.tSeasonStillOpen")}`}
                      </span>
                    </p>
                    {row.notes?.trim() ? (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">{row.notes.trim()}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {formatLocaleDateTime(row.createdAt, locale)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="min-h-10" onClick={() => openEdit(row)}>
                    {t("branch.tSeasonEdit")}
                  </Button>
                  {deleteId === row.id ? (
                    <>
                      <Button
                        type="button"
                        className="min-h-10"
                        onClick={() => void onConfirmDelete(row.id)}
                        disabled={deleteMut.isPending}
                      >
                        {t("branch.tSeasonDeleteConfirm")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-10"
                        onClick={() => setDeleteId(null)}
                        disabled={deleteMut.isPending}
                      >
                        {t("common.cancel")}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" variant="secondary" className="min-h-10" onClick={() => setDeleteId(row.id)}>
                      {t("branch.tSeasonDelete")}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("branch.tSeasonColYear")}</TableHeader>
                  <TableHeader>{t("branch.tSeasonColOpened")}</TableHeader>
                  <TableHeader>{t("branch.tSeasonColClosed")}</TableHeader>
                  <TableHeader>{t("branch.tSeasonColNotes")}</TableHeader>
                  <TableHeader className="hidden lg:table-cell">{t("branch.tSeasonColCreated")}</TableHeader>
                  <TableHeader className="w-[1%] text-right">{t("branch.tableActions")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums font-medium">{row.seasonYear}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatLocaleDate(row.openedOn, locale)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.closedOn ? formatLocaleDate(row.closedOn, locale) : t("branch.tSeasonStillOpen")}
                    </TableCell>
                    <TableCell className="max-w-[14rem] text-sm text-zinc-600">
                      {row.notes?.trim() ? (
                        <span className="line-clamp-2 whitespace-pre-wrap">{row.notes.trim()}</span>
                      ) : (
                        dash
                      )}
                    </TableCell>
                    <TableCell
                      dataLabel={t("branch.tSeasonColCreated")}
                      className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 whitespace-nowrap text-xs text-zinc-500 md:hidden lg:table-cell"
                    >
                      {formatLocaleDateTime(row.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      {deleteId === row.id ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-zinc-600">{t("branch.tSeasonDeleteAsk")}</span>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              className="min-h-9 px-2 text-sm"
                              onClick={() => void onConfirmDelete(row.id)}
                              disabled={deleteMut.isPending}
                            >
                              {t("branch.tSeasonDeleteConfirm")}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-9 px-2 text-sm"
                              onClick={() => setDeleteId(null)}
                              disabled={deleteMut.isPending}
                            >
                              {t("common.cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-9 px-2 text-sm"
                            onClick={() => openEdit(row)}
                          >
                            {t("branch.tSeasonEdit")}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-9 px-2 text-sm"
                            onClick={() => setDeleteId(row.id)}
                          >
                            {t("branch.tSeasonDelete")}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      <Modal
        open={formOpen}
        onClose={closeForm}
        titleId={FORM_MODAL_TITLE_ID}
        title={editing ? t("branch.tSeasonEditTitle") : t("branch.tSeasonAddTitle")}
        description={t("branch.tSeasonFormHint")}
        closeButtonLabel={t("common.close")}
        nested
        className="max-h-[min(90dvh,calc(100svh-2rem))] w-full max-w-[min(32rem,calc(100vw-1rem))] overflow-y-auto p-4 sm:max-w-lg sm:p-5 lg:max-h-[min(90dvh,44rem)] lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl"
      >
        <div className="mt-3 flex flex-col gap-3">
          <Input
            name="seasonYear"
            type="number"
            inputMode="numeric"
            min={1990}
            max={2100}
            label={t("branch.tSeasonColYear")}
            labelRequired
            value={seasonYear}
            onChange={(e) => setSeasonYear(e.target.value)}
          />
          <DateField
            name="openedOn"
            label={t("branch.tSeasonColOpened")}
            labelRequired
            value={openedOn}
            onChange={(e) => setOpenedOn(e.target.value)}
          />
          <DateField
            name="closedOn"
            label={t("branch.tSeasonColClosedOptional")}
            value={closedOn}
            onChange={(e) => setClosedOn(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="tseason-notes" className="text-sm font-medium text-zinc-700">
              {t("branch.tSeasonColNotes")}
            </label>
            <textarea
              id="tseason-notes"
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(
                "min-h-[5rem] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2"
              )}
            />
          </div>
          {!editing && priorYearGateApplies ? (
            yearClosureGateQuery.isPending || yearClosureGateQuery.isFetching ? (
              <Card className="border-zinc-200/80 bg-zinc-50/50 shadow-none ring-1 ring-zinc-950/[0.04]">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zinc-400 animate-pulse"
                    aria-hidden
                  />
                  <p className="text-sm leading-relaxed text-zinc-600">
                    {t("branch.tSeasonYearClosureGateLoading")}
                  </p>
                </div>
              </Card>
            ) : yearClosureGateQuery.isError ? (
              <Card className="border-amber-200/90 bg-amber-50/40 shadow-none ring-1 ring-amber-900/10">
                <p className="text-sm leading-relaxed text-amber-950">
                  {t("branch.tSeasonYearClosureGateError")}
                </p>
              </Card>
            ) : yearClosureBlockers.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-amber-200/90 bg-amber-50/35 shadow-sm ring-1 ring-amber-900/10">
                <div className="border-b border-amber-200/60 bg-amber-100/40 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-950">
                    {t("branch.tSeasonYearClosureBlockedTitle")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-amber-900/70">
                      {t("branch.tSeasonYearClosurePriorLabel")}
                    </span>
                    <span className="rounded-md bg-white/80 px-2 py-0.5 text-sm font-semibold tabular-nums text-zinc-900 ring-1 ring-amber-200/80">
                      {yearClosureGateQuery.data?.priorCalendarYear ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs leading-relaxed text-amber-950/85">
                    {t("branch.tSeasonYearClosureBlockedListIntro")}
                  </p>
                  <ul className="mt-3 max-h-44 divide-y divide-amber-200/50 overflow-y-auto rounded-lg border border-amber-200/40 bg-white/70">
                    {yearClosureBlockers.map((b) => (
                      <li
                        key={b.personnelId}
                        className="px-3 py-2.5 text-sm text-zinc-800"
                      >
                        {b.fullName.trim() || `#${b.personnelId}`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null
          ) : null}
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              className="min-h-11"
              disabled={saving || (!editing && createSaveBlockedByYearClosure)}
              onClick={() => void submitForm()}
            >
              {saving ? t("common.saving") : t("common.save")}
            </Button>
            <Button type="button" variant="secondary" className="min-h-11" disabled={saving} onClick={closeForm}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
