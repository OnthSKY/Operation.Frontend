"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useUpdatePersonnel } from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Branch } from "@/types/branch";
import type { Personnel } from "@/types/personnel";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
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
import { useI18n } from "@/i18n/context";
import { useEffect, useMemo, useState } from "react";

type Step = "pick" | "confirm";

type Props = {
  open: boolean;
  onClose: () => void;
  targetBranch: Branch;
  activePersonnel: Personnel[];
};

const TITLE_ID = "assign-personnel-branch-title";

function hireDateForApi(p: Personnel): string {
  const s = p.hireDate?.trim() ?? "";
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function needsTransferFromOtherBranch(p: Personnel, targetBranchId: number): boolean {
  return p.branchId != null && p.branchId > 0 && p.branchId !== targetBranchId;
}

function WizardProgress({
  step,
  pickLabel,
  confirmLabel,
}: {
  step: Step;
  pickLabel: string;
  confirmLabel: string;
}) {
  const items: { key: Step; label: string; index: number }[] = [
    { key: "pick", label: pickLabel, index: 1 },
    { key: "confirm", label: confirmLabel, index: 2 },
  ];
  return (
    <ol
      className="flex items-center gap-2 px-4 pb-3 pt-1 sm:px-6"
      aria-label="wizard"
    >
      {items.map((it, i) => {
        const active = it.key === step;
        const completed =
          (it.key === "pick" && step === "confirm") ? true : false;
        return (
          <li key={it.key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                active && "border-violet-600 bg-violet-600 text-white",
                completed && "border-violet-600 bg-violet-100 text-violet-700",
                !active && !completed && "border-zinc-300 bg-white text-zinc-500"
              )}
              aria-current={active ? "step" : undefined}
            >
              {completed ? "✓" : it.index}
            </span>
            <span
              className={cn(
                "truncate text-xs font-medium sm:text-sm",
                active ? "text-zinc-900" : "text-zinc-500"
              )}
            >
              {it.label}
            </span>
            {i === 0 ? (
              <span
                className={cn(
                  "ml-1 h-px flex-1 transition-colors",
                  step === "confirm" ? "bg-violet-300" : "bg-zinc-200"
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function AssignPersonnelToBranchModal({
  open,
  onClose,
  targetBranch,
  activePersonnel,
}: Props) {
  const { t } = useI18n();
  const { data: branches = [] } = useBranchesList();
  const updatePersonnel = useUpdatePersonnel();

  const [step, setStep] = useState<Step>("pick");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [pendingBatch, setPendingBatch] = useState<Personnel[] | null>(null);
  const [filter, setFilter] = useState("");

  const branchNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const candidates = useMemo(
    () =>
      activePersonnel.filter(
        (p) => !p.isDeleted && p.branchId !== targetBranch.id
      ),
    [activePersonnel, targetBranch.id]
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((p) => p.fullName.toLowerCase().includes(q));
  }, [candidates, filter]);

  const orderedSelected = useMemo(
    () => candidates.filter((p) => selectedIds.has(p.id)),
    [candidates, selectedIds]
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setSelectedIds(new Set());
    setPendingBatch(null);
    setFilter("");
  }, [open, targetBranch.id]);

  const currentBranchLabel = (p: Personnel): string => {
    if (p.branchId == null || p.branchId <= 0)
      return t("branch.assignPersonnelNoBranch");
    return branchNameById.get(p.branchId) ?? `#${p.branchId}`;
  };

  const toggleId = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const runAssignBatch = async (people: Personnel[]) => {
    if (people.length === 0) return;
    try {
      for (const p of people) {
        await updatePersonnel.mutateAsync({
          id: p.id,
          fullName: p.fullName,
          hireDate: hireDateForApi(p),
          jobTitle: p.jobTitle,
          salary: p.salary,
          branchId: targetBranch.id,
        });
      }
      notify.success(
        people.length === 1
          ? t("toast.personnelMovedToBranch")
          : t("toast.personnelMovedToBranchMany").replace("{count}", String(people.length))
      );
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onPrimaryPick = () => {
    if (orderedSelected.length === 0) return;
    const needConfirm = orderedSelected.some((p) =>
      needsTransferFromOtherBranch(p, targetBranch.id)
    );
    if (needConfirm) {
      setPendingBatch(orderedSelected);
      setStep("confirm");
      return;
    }
    void runAssignBatch(orderedSelected);
  };

  const onConfirmTransfer = () => {
    if (!pendingBatch?.length) return;
    void runAssignBatch(pendingBatch);
  };

  const onBackFromConfirm = () => {
    setPendingBatch(null);
    setStep("pick");
  };

  const isDirty =
    step === "confirm" || selectedIds.size > 0 || filter.trim() !== "";
  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked: updatePersonnel.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose,
  });

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("branch.assignPersonnelTitle")}
      description={t("branch.assignPersonnelHint")}
      closeButtonLabel={t("common.close")}
      wide
      wideFixedHeight
      className="max-sm:max-h-[min(100dvh,100svh)] max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0"
    >
      <WizardProgress
        step={step}
        pickLabel={t("branch.assignPersonnelStepPickLabel")}
        confirmLabel={t("branch.assignPersonnelStepConfirmLabel")}
      />
      {step === "confirm" && pendingBatch && pendingBatch.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-6 sm:pb-6">
          <div className="shrink-0">
            <p className="text-sm leading-relaxed text-zinc-700">
              {t("branch.assignPersonnelConfirmSummary")
                .replace("{n}", String(pendingBatch.length))
                .replace("{toBranch}", targetBranch.name)}
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("branch.assignPersonnelConfirmListTitle")}
            </p>
          </div>
          <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
            {pendingBatch.map((p) => {
              const from = currentBranchLabel(p);
              const isTransfer = needsTransferFromOtherBranch(p, targetBranch.id);
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {p.fullName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-zinc-600">
                        {t("branch.assignPersonnelConfirmRowFromTo")
                          .replace("{from}", from)
                          .replace("{to}", targetBranch.name)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        isTransfer
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      {isTransfer
                        ? t("branch.assignPersonnelConfirmBatchTransfersTitle").replace(":", "")
                        : t("branch.assignPersonnelNoBranch")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto sm:min-w-[120px]"
              disabled={updatePersonnel.isPending}
              onClick={onBackFromConfirm}
            >
              {t("branch.assignPersonnelConfirmBack")}
            </Button>
            <Button
              type="button"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto sm:min-w-[120px]"
              disabled={updatePersonnel.isPending}
              onClick={onConfirmTransfer}
            >
              {updatePersonnel.isPending
                ? t("common.saving")
                : t("branch.assignPersonnelConfirmSubmit")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-6 sm:pb-5 sm:pt-3">
          <div className="shrink-0">
            <Input
              label={t("branch.assignPersonnelFilter")}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoComplete="off"
            />
            {filtered.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <button
                  type="button"
                  className={cn(
                    "font-medium text-violet-700 underline-offset-2 hover:underline",
                    allFilteredSelected && "text-zinc-400 hover:no-underline"
                  )}
                  disabled={allFilteredSelected}
                  onClick={selectAllFiltered}
                >
                  {t("branch.assignPersonnelSelectAll")}
                </button>
                <button
                  type="button"
                  className={cn(
                    "font-medium text-violet-700 underline-offset-2 hover:underline",
                    selectedIds.size === 0 && "pointer-events-none text-zinc-400 hover:no-underline"
                  )}
                  disabled={selectedIds.size === 0}
                  onClick={clearSelection}
                >
                  {t("branch.assignPersonnelClearSelection")}
                </button>
                {selectedIds.size > 0 ? (
                  <span className="text-zinc-500">
                    {t("branch.assignPersonnelSelectedCount").replace(
                      "{n}",
                      String(selectedIds.size)
                    )}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {filtered.length === 0 ? (
            <p className="mt-3 shrink-0 text-sm text-zinc-500">{t("branch.assignPersonnelEmpty")}</p>
          ) : (
            <>
              <div className="mt-3 min-h-[min(42dvh,15rem)] flex-1 overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 md:hidden">
                <ul className="divide-y divide-zinc-100">
                  {filtered.map((p) => {
                    const checked = selectedIds.has(p.id);
                    return (
                      <li key={p.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "flex w-full touch-manipulation items-start gap-3 px-4 py-3.5 text-left transition-colors outline-none focus-visible:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400",
                            checked ? "bg-violet-50/90" : "hover:bg-zinc-50 active:bg-zinc-100"
                          )}
                          onClick={() => toggleId(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleId(p.id);
                            }
                          }}
                        >
                          <span className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleId(p.id)}
                              aria-label={p.fullName}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-base font-medium leading-snug text-zinc-900">
                              {p.fullName}
                            </span>
                            <span className="mt-1 block text-sm leading-snug text-zinc-500">
                              <span className="font-medium text-zinc-600">
                                {t("branch.assignPersonnelCurrentBranch")}:
                              </span>{" "}
                              {currentBranchLabel(p)}
                            </span>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-3 hidden min-h-0 min-h-[16rem] flex-1 overflow-auto overscroll-contain rounded-xl border border-zinc-200 md:block">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="w-[1%] whitespace-nowrap pr-2">
                        <span className="sr-only">{t("branch.assignPersonnelPick")}</span>
                      </TableHeader>
                      <TableHeader>{t("branch.staffName")}</TableHeader>
                      <TableHeader className="min-w-[8rem]">
                        {t("branch.assignPersonnelCurrentBranch")}
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((p) => {
                      const checked = selectedIds.has(p.id);
                      return (
                        <TableRow
                          key={p.id}
                          className={cn(
                            "cursor-pointer min-h-[48px]",
                            checked && "bg-violet-50/80"
                          )}
                          onClick={() => toggleId(p.id)}
                        >
                          <TableCell
                            className="w-[1%] whitespace-nowrap pr-2 align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleId(p.id)}
                              aria-label={p.fullName}
                            />
                          </TableCell>
                          <TableCell className="min-w-0 max-w-[12rem] truncate font-medium text-zinc-900 lg:max-w-none">
                            {p.fullName}
                          </TableCell>
                          <TableCell className="min-w-0 text-sm text-zinc-600">
                            {currentBranchLabel(p)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <div className="mt-3 flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto sm:min-w-[120px]"
              onClick={requestClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto sm:min-w-[120px]"
              disabled={orderedSelected.length === 0 || updatePersonnel.isPending}
              onClick={onPrimaryPick}
            >
              {updatePersonnel.isPending ? t("common.saving") : t("branch.assignPersonnelAdd")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
