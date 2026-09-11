"use client";

import type { Locale } from "@/i18n/messages";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";
import { PencilIcon } from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import {
  useCreatePersonnelEmploymentTerm,
  useDeletePersonnelEmploymentTerm,
  useUpdatePersonnelEmploymentTermSalary,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import type {
  PersonnelEmploymentTerm,
  PersonnelYearAccountClosureListItem,
} from "@/types/personnel-account-closure";
import { useId, useMemo, useState } from "react";

function salaryHistoryTypeLabel(
  t: (k: string) => string,
  raw: string,
): string {
  const u = (raw ?? "").trim().toUpperCase();
  if (u === "NET") return t("personnel.settlementSalaryCostSalaryTypeNet");
  if (u === "GROSS") return t("personnel.settlementSalaryCostSalaryTypeGross");
  return raw?.trim() || "";
}

export type PersonnelSalaryHistoryViewProps = {
  personnelId: number;
  readOnly: boolean;
  currentSalary: number | null | undefined;
  currencyCode: string;
  terms: PersonnelEmploymentTerm[];
  termsLoading: boolean;
  termsError: boolean;
  termsErr: unknown;
  closures: PersonnelYearAccountClosureListItem[];
  closuresLoading: boolean;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
};

/**
 * Personel maaş geçmişi sekmesi: mevcut maaş + dönemler + sezon bazlı kapanış.
 * Geçmiş (kapalı) dönemler için maaş ekleme/düzenleme/silme yapılabilir; maaş ayı
 * kaydı olan dönemler backend'de korunur (silme/düzenleme engellenir).
 */
export function PersonnelSalaryHistoryView({
  personnelId,
  readOnly,
  currentSalary,
  currencyCode,
  terms,
  termsLoading,
  termsError,
  termsErr,
  closures,
  closuresLoading,
  t,
  locale,
  dash,
}: PersonnelSalaryHistoryViewProps) {
  const addModalTitleId = useId();
  const editModalTitleId = useId();
  const createMut = useCreatePersonnelEmploymentTerm(personnelId);
  const updateSalaryMut = useUpdatePersonnelEmploymentTermSalary(personnelId);
  const deleteMut = useDeletePersonnelEmploymentTerm(personnelId);

  const sortedTerms = useMemo(
    () =>
      [...terms].sort((a, b) =>
        b.validFrom.slice(0, 10).localeCompare(a.validFrom.slice(0, 10)),
      ),
    [terms],
  );
  const openTerm = useMemo(() => terms.find((x) => x.isOpen) ?? null, [terms]);

  const seasonRows = [...closures]
    .filter((c) => c.closureExpectedSalaryAmount != null)
    .sort((a, b) => b.closureYear - a.closureYear);
  const cur = (currencyCode ?? "TRY").trim() || "TRY";
  const rowCls = "flex flex-wrap items-baseline justify-between gap-2 px-4 py-3";
  const listCls =
    "divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white";

  const salaryTypeOptions = useMemo(
    () => [
      { value: "GROSS", label: t("personnel.settlementSalaryCostSalaryTypeGross") },
      { value: "NET", label: t("personnel.settlementSalaryCostSalaryTypeNet") },
    ],
    [t],
  );

  const [addOpen, setAddOpen] = useState(false);
  const [addValidFrom, setAddValidFrom] = useState("");
  const [addSalary, setAddSalary] = useState("");
  const [addSalaryType, setAddSalaryType] = useState("GROSS");

  const [editTerm, setEditTerm] = useState<PersonnelEmploymentTerm | null>(null);
  const [editSalary, setEditSalary] = useState("");
  const [editSalaryType, setEditSalaryType] = useState("GROSS");

  const openAddModal = () => {
    setAddValidFrom("");
    setAddSalary(openTerm?.salary != null ? String(openTerm.salary) : "");
    setAddSalaryType((openTerm?.salaryType ?? "GROSS").toUpperCase());
    setAddOpen(true);
  };

  const onAdd = async () => {
    if (readOnly || !openTerm) return;
    const vf = addValidFrom.trim().slice(0, 10);
    const amount = Number(addSalary.replace(",", "."));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vf)) {
      notify.error(t("personnel.seasonArrivalsInvalidDate"));
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      notify.error(t("personnel.salaryHistoryInvalidAmount"));
      return;
    }
    try {
      await createMut.mutateAsync({
        validFrom: vf,
        arrivalDate: vf,
        branchId: openTerm.branchId,
        salary: amount,
        currencyCode: openTerm.currencyCode || cur,
        salaryType: addSalaryType,
        employmentType: openTerm.employmentType,
        isManualEmployerCostOverride: false,
      });
      notify.success(t("personnel.salaryHistoryAddSuccess"));
      setAddOpen(false);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onStartEdit = (term: PersonnelEmploymentTerm) => {
    if (readOnly) return;
    setEditTerm(term);
    setEditSalary(term.salary != null ? String(term.salary) : "");
    setEditSalaryType((term.salaryType ?? "GROSS").toUpperCase());
  };

  const onCancelEdit = () => {
    setEditTerm(null);
    setEditSalary("");
  };

  const onSaveEdit = async () => {
    if (readOnly || !editTerm) return;
    const amount = Number(editSalary.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) {
      notify.error(t("personnel.salaryHistoryInvalidAmount"));
      return;
    }
    try {
      await updateSalaryMut.mutateAsync({
        termId: editTerm.id,
        body: {
          salary: amount,
          currencyCode: editTerm.currencyCode || cur,
          salaryType: editSalaryType,
        },
      });
      notify.success(t("personnel.salaryHistorySaveSuccess"));
      onCancelEdit();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onDelete = (term: PersonnelEmploymentTerm) => {
    if (readOnly) return;
    notifyConfirmToast({
      toastId: `salary-history-delete-${personnelId}-${term.id}`,
      title: t("personnel.salaryHistoryDeleteConfirmTitle"),
      message: t("personnel.salaryHistoryDeleteConfirmMessage"),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(term.id);
          notify.success(t("personnel.salaryHistoryDeleteSuccess"));
          if (editTerm?.id === term.id) onCancelEdit();
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });
  };

  const busy =
    createMut.isPending || updateSalaryMut.isPending || deleteMut.isPending;

  return (
    <div className="min-w-0 space-y-5 pb-2">
      <p className="text-sm leading-relaxed text-zinc-600">
        {t("personnel.salaryHistoryIntro")}
      </p>

      <div className="rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50/80 to-white px-4 py-3 shadow-sm shadow-zinc-900/5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t("personnel.salaryHistoryCurrentLabel")}
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">
          {currentSalary != null
            ? formatLocaleAmount(currentSalary, locale, cur)
            : dash}
        </p>
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">
            {t("personnel.salaryHistoryTermsTitle")}
          </h3>
          {!readOnly && openTerm ? (
            <Button
              type="button"
              className="min-h-[44px]"
              disabled={busy}
              onClick={openAddModal}
            >
              {t("personnel.salaryHistoryAddButton")}
            </Button>
          ) : null}
        </div>
        {termsLoading ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : termsError ? (
          <p className="text-sm text-red-600">{toErrorMessage(termsErr)}</p>
        ) : sortedTerms.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t("personnel.salaryHistoryTermsEmpty")}
          </p>
        ) : (
          <ul className={listCls}>
            {sortedTerms.map((term) => {
              const from = formatLocaleDate(
                term.validFrom.slice(0, 10),
                locale,
                dash,
              );
              const to = term.isOpen
                ? t("personnel.salaryHistoryOpen")
                : term.validTo
                  ? formatLocaleDate(term.validTo.slice(0, 10), locale, dash)
                  : dash;
              const typeLabel = salaryHistoryTypeLabel(t, term.salaryType);
              return (
                <li key={term.id} className={rowCls}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      {from} – {to}
                    </p>
                    {typeLabel ? (
                      <p className="mt-0.5 text-xs text-zinc-500">{typeLabel}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold tabular-nums text-zinc-900">
                      {term.salary != null
                        ? formatLocaleAmount(
                            term.salary,
                            locale,
                            term.currencyCode || cur,
                          )
                        : dash}
                    </p>
                    {!readOnly ? (
                      <div className="flex items-center gap-1">
                        {/* Açık dönemde güncel maaş, kapalı dönemde geçmiş maaş düzenlenir. */}
                        <button
                          type="button"
                          className={`${trashIconActionButtonClass} border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50`}
                          disabled={busy}
                          title={
                            term.isOpen
                              ? t("personnel.salaryHistoryEditCurrent")
                              : t("personnel.salaryHistoryEdit")
                          }
                          aria-label={
                            term.isOpen
                              ? t("personnel.salaryHistoryEditCurrent")
                              : t("personnel.salaryHistoryEdit")
                          }
                          onClick={() => onStartEdit(term)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={trashIconActionButtonClass}
                          disabled={busy}
                          title={t("personnel.salaryHistoryDelete")}
                          aria-label={t("personnel.salaryHistoryDelete")}
                          onClick={() => onDelete(term)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("personnel.salaryHistorySeasonTitle")}
        </h3>
        {closuresLoading ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : seasonRows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t("personnel.salaryHistorySeasonEmpty")}
          </p>
        ) : (
          <ul className={listCls}>
            {seasonRows.map((c) => (
              <li key={c.id} className={rowCls}>
                <div className="min-w-0">
                  <p className="text-sm font-medium tabular-nums text-zinc-900">
                    {c.closureYear}
                  </p>
                  {c.closureWorkedDays != null ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {t("personnel.salaryHistoryWorkedDays").replace(
                        "{n}",
                        String(c.closureWorkedDays),
                      )}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm font-semibold tabular-nums text-zinc-900">
                  {formatLocaleAmount(
                    c.closureExpectedSalaryAmount ?? 0,
                    locale,
                    c.closureExpectedSalaryCurrency || cur,
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!readOnly && openTerm ? (
        <Modal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          titleId={addModalTitleId}
          title={t("personnel.salaryHistoryAddButton")}
          closeButtonLabel={t("common.close")}
          className="w-full max-w-md"
        >
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-zinc-600">
              {t("personnel.salaryHistoryAddHint")}
            </p>
            <DateField
              mode="date"
              label={t("personnel.salaryHistoryValidFrom")}
              value={addValidFrom}
              onChange={(e) => setAddValidFrom(e.target.value)}
              disabled={createMut.isPending}
            />
            <Input
              label={t("personnel.salaryHistoryAmount")}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={addSalary}
              onChange={(e) => setAddSalary(e.target.value)}
              disabled={createMut.isPending}
            />
            <Select
              name="salaryHistoryAddType"
              label={t("personnel.salaryHistorySalaryType")}
              options={salaryTypeOptions}
              value={addSalaryType}
              onChange={(e) => setAddSalaryType(e.target.value)}
              onBlur={() => {}}
              disabled={createMut.isPending}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="min-h-[44px] min-w-[44px]"
                disabled={createMut.isPending}
                onClick={() => setAddOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="min-h-[44px] min-w-[44px]"
                disabled={
                  createMut.isPending ||
                  addValidFrom.trim() === "" ||
                  addSalary.trim() === ""
                }
                onClick={() => void onAdd()}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {!readOnly && editTerm ? (
        <Modal
          open={editTerm != null}
          onClose={onCancelEdit}
          titleId={editModalTitleId}
          title={
            editTerm.isOpen
              ? t("personnel.salaryHistoryEditCurrent")
              : t("personnel.salaryHistoryEdit")
          }
          closeButtonLabel={t("common.close")}
          className="w-full max-w-md"
        >
          <div className="space-y-3">
            <p className="text-xs text-zinc-600">
              {formatLocaleDate(editTerm.validFrom.slice(0, 10), locale, dash)}
              {" – "}
              {editTerm.validTo
                ? formatLocaleDate(editTerm.validTo.slice(0, 10), locale, dash)
                : t("personnel.salaryHistoryOpen")}
            </p>
            <Input
              label={t("personnel.salaryHistoryAmount")}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={editSalary}
              onChange={(e) => setEditSalary(e.target.value)}
              disabled={updateSalaryMut.isPending}
            />
            <Select
              name="salaryHistoryEditType"
              label={t("personnel.salaryHistorySalaryType")}
              options={salaryTypeOptions}
              value={editSalaryType}
              onChange={(e) => setEditSalaryType(e.target.value)}
              onBlur={() => {}}
              disabled={updateSalaryMut.isPending}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="min-h-[44px] min-w-[44px]"
                disabled={updateSalaryMut.isPending}
                onClick={onCancelEdit}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="min-h-[44px] min-w-[44px]"
                disabled={updateSalaryMut.isPending || editSalary.trim() === ""}
                onClick={() => void onSaveEdit()}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
