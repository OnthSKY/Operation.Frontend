"use client";

import { fetchRegisterIncomeCashSettlementCandidates } from "@/modules/branch/api/branch-transactions-api";
import {
  useBulkPatchBranchTransactionsCashSettlement,
  usePatchBranchTransactionCashSettlement,
} from "@/modules/branch/hooks/useBranchQueries";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import { registerCashSettlementLabel } from "@/modules/branch/components/BranchDetailTabs.shared";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";
import { useI18n } from "@/i18n/context";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { DateField } from "@/shared/ui/DateField";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  branchId: number;
  branchStaff: Personnel[];
  mode: "single" | "bulk";
  singleRow: BranchTransaction | null;
  onApplied: () => void;
};

export function RegisterIncomeCashSettlementDialog({
  open,
  onClose,
  branchId,
  branchStaff,
  mode,
  singleRow,
  onApplied,
}: Props) {
  const { t, locale } = useI18n();
  const patchMut = usePatchBranchTransactionCashSettlement();
  const bulkMut = useBulkPatchBranchTransactionsCashSettlement();
  const busy = patchMut.isPending || bulkMut.isPending;

  const [party, setParty] = useState("");
  const [personnelId, setPersonnelId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [bulkDateFrom, setBulkDateFrom] = useState("");
  const [bulkDateTo, setBulkDateTo] = useState("");

  const bulkDatesOk =
    bulkDateFrom.length === 10 && bulkDateTo.length === 10 && bulkDateFrom <= bulkDateTo;

  const {
    data: candidates = [],
    isPending: candidatesLoading,
    isError: candidatesErr,
    error: candidatesError,
  } = useQuery({
    queryKey: [
      "branch-transactions",
      "register-income-cash-settlement-candidates",
      branchId,
      bulkDateFrom,
      bulkDateTo,
    ],
    queryFn: () => fetchRegisterIncomeCashSettlementCandidates(branchId, bulkDateFrom, bulkDateTo),
    enabled: open && mode === "bulk" && bulkDatesOk,
  });

  useEffect(() => {
    if (!open) {
      setParty("");
      setPersonnelId("");
      setSelectedIds(new Set());
      return;
    }
    if (mode === "single" && singleRow) {
      setParty(String(singleRow.cashSettlementParty ?? "").trim().toUpperCase());
      setPersonnelId(
        singleRow.cashSettlementPersonnelId != null && singleRow.cashSettlementPersonnelId > 0
          ? String(singleRow.cashSettlementPersonnelId)
          : ""
      );
      return;
    }
    if (mode === "bulk") {
      setParty("");
      setPersonnelId("");
      const today = localIsoDate();
      setBulkDateFrom(today);
      setBulkDateTo(today);
    }
  }, [open, mode, singleRow?.id, singleRow?.cashSettlementParty, singleRow?.cashSettlementPersonnelId]);

  useEffect(() => {
    if (mode !== "bulk" || !open) return;
    setSelectedIds(new Set(candidates.map((c) => c.id)));
  }, [mode, open, candidates]);

  const partyOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "", label: t("branch.cashSettlementUnset") },
      { value: "PATRON", label: t("branch.cashSettlementPatron") },
      { value: "BRANCH_MANAGER", label: t("branch.cashSettlementBranchManager") },
      { value: "REMAINS_AT_BRANCH", label: t("branch.cashSettlementRemainsAtBranch") },
    ];
  }, [t]);

  const staffOptions: SelectOption[] = useMemo(() => {
    const loc = locale === "tr" ? "tr" : "en";
    return [
      { value: "", label: t("branch.cashSettlementResponsiblePick") },
      ...[...branchStaff]
        .sort((a, b) => a.fullName.localeCompare(b.fullName, loc))
        .map((p) => ({
          value: String(p.id),
          label: `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`,
        })),
    ];
  }, [branchStaff, locale, t]);

  const allCandidatesSelected =
    candidates.length > 0 && candidates.every((c) => selectedIds.has(c.id));
  const rowsWithExistingSettlement = candidates.filter(
    (c) => String(c.cashSettlementParty ?? "").trim().length > 0
  ).length;

  const selectionDirty =
    mode === "bulk" &&
    candidates.length > 0 &&
    (selectedIds.size !== candidates.length || !candidates.every((c) => selectedIds.has(c.id)));

  const isDirty =
    party.trim() !== "" ||
    personnelId.trim() !== "" ||
    (mode === "bulk" && selectionDirty);

  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: busy,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose,
  });

  const toggleSelectAll = useCallback(() => {
    if (candidates.length === 0) return;
    if (allCandidatesSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(candidates.map((c) => c.id)));
  }, [candidates, allCandidatesSelected]);

  const toggleRow = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const submit = useCallback(async () => {
    const p = party.trim().toUpperCase();
    if (p === "BRANCH_MANAGER" && !personnelId.trim()) {
      notify.error(t("branch.registerCashSettlementNeedPerson"));
      return;
    }
    const body = {
      cashSettlementParty: p.length > 0 ? p : null,
      cashSettlementPersonnelId:
        p === "BRANCH_MANAGER" && personnelId.trim()
          ? parseInt(personnelId.trim(), 10)
          : null,
    };

    try {
      if (mode === "single") {
        if (!singleRow) return;
        await patchMut.mutateAsync({ transactionId: singleRow.id, body });
        notify.success(t("branch.registerCashSettlementSaved"));
      } else {
        if (!bulkDatesOk) {
          notify.error(t("branch.registerCashSettlementBulkDatesInvalid"));
          return;
        }
        if (selectedIds.size === 0) {
          notify.error(t("branch.registerCashSettlementNeedSelection"));
          return;
        }
        const res = await bulkMut.mutateAsync({
          branchId,
          dateFrom: bulkDateFrom,
          dateTo: bulkDateTo,
          transactionIds: Array.from(selectedIds),
          ...body,
        });
        const failed = res.results.filter((r) => !r.ok).length;
        if (failed === 0) {
          notify.success(`${t("branch.registerCashSettlementBulkDone")} (${res.updatedCount})`);
        } else {
          notify.info(`${t("branch.registerCashSettlementBulkPartial")} (${res.updatedCount} ok, ${failed} failed)`);
        }
      }
      onApplied();
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [
    party,
    personnelId,
    mode,
    singleRow,
    bulkDatesOk,
    bulkDateFrom,
    bulkDateTo,
    branchId,
    selectedIds,
    patchMut,
    bulkMut,
    onApplied,
    onClose,
    t,
  ]);

  const title =
    mode === "single"
      ? t("branch.registerCashSettlementTitleSingle")
      : t("branch.registerCashSettlementTitleBulk");

  const selectedCountLabel = t("branch.registerCashSettlementSelectedCount").replace(
    "{n}",
    String(selectedIds.size)
  );

  return (
    <Modal
      open={open}
      titleId="register-income-cash-settlement"
      title={title}
      onClose={requestClose}
      narrow={mode === "single"}
      wide={mode === "bulk"}
      className={
        mode === "bulk"
          ? "max-w-[min(100vw-2rem,88rem)] sm:max-w-[min(100vw-2.5rem,90rem)] lg:max-w-[min(100vw-3rem,96rem)]"
          : undefined
      }
      closeButtonLabel={t("common.close")}
    >
      <div
        className={
          mode === "bulk"
            ? "space-y-4 px-3 pb-3 sm:px-4 sm:pb-4 md:px-5 md:pb-5"
            : "space-y-4"
        }
      >
        {mode === "single" && singleRow ? (
          <p className="text-xs leading-relaxed text-zinc-600">
            {t("branch.registerCashSettlementLeadSingle")}{" "}
            <span className="font-mono font-medium text-zinc-800">
              #{singleRow.id} · {singleRow.transactionDate}
            </span>
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-zinc-600">
            {bulkDatesOk ? (
              <>
                {t("branch.registerCashSettlementLeadBulk")}{" "}
                <span className="font-mono font-medium text-zinc-800">
                  {bulkDateFrom} — {bulkDateTo}
                </span>
              </>
            ) : (
              t("branch.registerCashSettlementBulkDatesInvalid")
            )}
          </p>
        )}
        {mode === "bulk" ? (
          <p className="text-xs text-amber-900/90">{t("branch.registerCashSettlementHintPatronBulk")}</p>
        ) : null}
        {mode === "bulk" ? (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 sm:grid-cols-2">
            <DateField
              label={t("branch.filterDateFrom")}
              value={bulkDateFrom}
              onChange={(e) => setBulkDateFrom(e.target.value)}
              className="min-w-0"
            />
            <DateField
              label={t("branch.filterDateTo")}
              value={bulkDateTo}
              onChange={(e) => setBulkDateTo(e.target.value)}
              className="min-w-0"
            />
          </div>
        ) : null}

        {mode === "bulk" && bulkDatesOk ? (
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-2.5 shadow-inner shadow-zinc-200/30">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-2">
              <p className="text-xs font-semibold text-zinc-800">{t("branch.registerCashSettlementRowsTitle")}</p>
              <p className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 shadow-sm">
                {selectedCountLabel}
              </p>
            </div>
            {candidatesLoading ? (
              <p className="py-4 text-center text-sm text-zinc-500">{t("branch.registerCashSettlementCandidatesLoading")}</p>
            ) : candidatesErr ? (
              <p className="py-3 text-center text-sm text-red-600">{toErrorMessage(candidatesError)}</p>
            ) : candidates.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-600">{t("branch.registerCashSettlementCandidatesEmpty")}</p>
            ) : (
              <>
                <div className="my-2 rounded-lg border border-zinc-200/90 bg-white px-2 py-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allCandidatesSelected}
                        onCheckedChange={() => toggleSelectAll()}
                        aria-label={t("branch.registerCashSettlementSelectAll")}
                      />
                      <span className="text-sm font-semibold text-zinc-800">
                        {t("branch.registerCashSettlementSelectAll")}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">{candidates.length}</span>
                  </div>
                  {rowsWithExistingSettlement > 0 ? (
                    <p className="mt-1.5 text-[11px] font-medium text-amber-800">
                      {t("branch.registerCashSettlementExistingRowsHint").replace(
                        "{n}",
                        String(rowsWithExistingSettlement)
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="max-h-56 overflow-y-auto overscroll-y-contain">
                  <ul className="space-y-1.5">
                    {candidates.map((row) => (
                      <li key={row.id}>
                        {(() => {
                          const existing = registerCashSettlementLabel(row, t);
                          const hasExisting = existing.trim().length > 0;
                          return (
                        <div
                          className={`flex items-start gap-2 rounded-lg border px-2 py-2 text-sm transition ${
                            selectedIds.has(row.id)
                              ? "border-violet-200 bg-violet-50/70 ring-1 ring-violet-100"
                              : "border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50/80"
                          }`}
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={selectedIds.has(row.id)}
                            onCheckedChange={() => toggleRow(row.id)}
                            aria-label={`#${row.id}`}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs text-zinc-500">#{row.id}</span>{" "}
                            <span className="text-zinc-700">
                              {formatLocaleDate(row.transactionDate, locale)}
                            </span>
                            <span className="mx-1 text-zinc-400">·</span>
                            <span className="font-mono font-medium text-emerald-800">
                              {formatMoneyDash(row.amount, t("personnel.dash"), locale, row.currencyCode)}
                            </span>
                            <span className="mt-0.5 block text-xs text-zinc-600">
                              {txCategoryLine(row.mainCategory, row.category, t) || "—"}
                            </span>
                            {hasExisting ? (
                              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                                {t("branch.registerCashSettlementExistingBadge")}: {existing}
                              </span>
                            ) : null}
                          </div>
                        </div>
                          );
                        })()}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        ) : null}

        <Select
          name="cashParty"
          label={t("branch.cashSettlementLabel")}
          options={partyOptions}
          value={party}
          menuZIndex={320}
          onChange={(e) => {
            setParty(e.target.value);
            if (e.target.value !== "BRANCH_MANAGER") setPersonnelId("");
          }}
          onBlur={() => {}}
        />

        {party === "BRANCH_MANAGER" ? (
          <Select
            name="cashPersonnel"
            label={t("branch.cashSettlementResponsiblePerson")}
            options={staffOptions}
            value={personnelId}
            menuZIndex={320}
            onChange={(e) => setPersonnelId(e.target.value)}
            onBlur={() => {}}
          />
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="min-h-11" disabled={busy} onClick={requestClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={
              busy ||
              (mode === "bulk" &&
                (!bulkDatesOk || candidatesLoading || candidates.length === 0 || selectedIds.size === 0))
            }
            onClick={() => void submit()}
          >
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
