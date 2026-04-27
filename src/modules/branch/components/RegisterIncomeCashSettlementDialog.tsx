"use client";

import { fetchRegisterIncomeCashSettlementCandidates } from "@/modules/branch/api/branch-transactions-api";
import {
  useBulkPatchBranchTransactionsCashSettlement,
  usePatchBranchTransactionCashSettlement,
} from "@/modules/branch/hooks/useBranchQueries";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";
import { useI18n } from "@/i18n/context";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { Button } from "@/shared/ui/Button";
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
  bulkDateFrom: string;
  bulkDateTo: string;
  onApplied: () => void;
};

export function RegisterIncomeCashSettlementDialog({
  open,
  onClose,
  branchId,
  branchStaff,
  mode,
  singleRow,
  bulkDateFrom,
  bulkDateTo,
  onApplied,
}: Props) {
  const { t, locale } = useI18n();
  const patchMut = usePatchBranchTransactionCashSettlement();
  const bulkMut = useBulkPatchBranchTransactionsCashSettlement();
  const busy = patchMut.isPending || bulkMut.isPending;

  const [party, setParty] = useState("");
  const [personnelId, setPersonnelId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

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
    }
  }, [open, mode, singleRow?.id, singleRow?.cashSettlementParty, singleRow?.cashSettlementPersonnelId]);

  useEffect(() => {
    if (mode !== "bulk" || !open) return;
    setSelectedIds(new Set(candidates.map((c) => c.id)));
  }, [mode, open, candidates]);

  const partyOptions: SelectOption[] = useMemo(() => {
    const all: SelectOption[] = [
      { value: "", label: t("branch.cashSettlementUnset") },
      { value: "PATRON", label: t("branch.cashSettlementPatron") },
      { value: "BRANCH_MANAGER", label: t("branch.cashSettlementBranchManager") },
      { value: "REMAINS_AT_BRANCH", label: t("branch.cashSettlementRemainsAtBranch") },
    ];
    if (mode === "bulk") return all.filter((o) => o.value !== "PATRON");
    return all;
  }, [mode, t]);

  const staffOptions: SelectOption[] = useMemo(() => {
    const loc = locale === "tr" ? "tr" : "en";
    const list = branchStaff.filter((p) => !p.isDeleted && p.branchId === branchId);
    return [
      { value: "", label: t("branch.cashSettlementResponsiblePick") },
      ...[...list]
        .sort((a, b) => a.fullName.localeCompare(b.fullName, loc))
        .map((p) => ({
          value: String(p.id),
          label: `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`,
        })),
    ];
  }, [branchStaff, branchId, locale, t]);

  const allCandidatesSelected =
    candidates.length > 0 && candidates.every((c) => selectedIds.has(c.id));

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
      closeButtonLabel={t("common.close")}
    >
      <div className="space-y-4">
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

        {mode === "bulk" && bulkDatesOk ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-2">
              <p className="text-xs font-semibold text-zinc-800">{t("branch.registerCashSettlementRowsTitle")}</p>
              <p className="text-[11px] text-zinc-600">{selectedCountLabel}</p>
            </div>
            {candidatesLoading ? (
              <p className="py-4 text-center text-sm text-zinc-500">{t("branch.registerCashSettlementCandidatesLoading")}</p>
            ) : candidatesErr ? (
              <p className="py-3 text-center text-sm text-red-600">{toErrorMessage(candidatesError)}</p>
            ) : candidates.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-600">{t("branch.registerCashSettlementCandidatesEmpty")}</p>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-2 border-b border-zinc-200/60 px-1 py-2 text-sm font-medium text-zinc-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-400 text-zinc-900"
                    checked={allCandidatesSelected}
                    onChange={toggleSelectAll}
                    aria-label={t("branch.registerCashSettlementSelectAll")}
                  />
                  <span>{t("branch.registerCashSettlementSelectAll")}</span>
                </label>
                <div className="max-h-56 overflow-y-auto overscroll-y-contain">
                  <ul className="divide-y divide-zinc-200/80">
                    {candidates.map((row) => (
                      <li key={row.id}>
                        <label className="flex cursor-pointer items-start gap-2 px-1 py-2 text-sm hover:bg-white/80">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400 text-zinc-900"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            aria-label={`#${row.id}`}
                          />
                          <span className="min-w-0 flex-1">
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
                          </span>
                        </label>
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
