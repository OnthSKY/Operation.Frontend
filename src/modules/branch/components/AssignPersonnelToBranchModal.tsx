"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useUpdatePersonnel } from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Branch } from "@/types/branch";
import type { Personnel } from "@/types/personnel";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pending, setPending] = useState<Personnel | null>(null);
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

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setSelectedId(null);
    setPending(null);
    setFilter("");
  }, [open, targetBranch.id]);

  const currentBranchLabel = (p: Personnel): string => {
    if (p.branchId == null || p.branchId <= 0)
      return t("branch.assignPersonnelNoBranch");
    return branchNameById.get(p.branchId) ?? `#${p.branchId}`;
  };

  const selected = useMemo(
    () => (selectedId != null ? candidates.find((p) => p.id === selectedId) ?? null : null),
    [candidates, selectedId]
  );

  const runAssign = async (p: Personnel) => {
    try {
      await updatePersonnel.mutateAsync({
        id: p.id,
        fullName: p.fullName,
        hireDate: hireDateForApi(p),
        jobTitle: p.jobTitle,
        salary: p.salary,
        branchId: targetBranch.id,
      });
      notify.success(t("toast.personnelMovedToBranch"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onPrimaryPick = () => {
    if (!selected) return;
    const other =
      selected.branchId != null &&
      selected.branchId > 0 &&
      selected.branchId !== targetBranch.id;
    if (other) {
      setPending(selected);
      setStep("confirm");
      return;
    }
    void runAssign(selected);
  };

  const onConfirmTransfer = () => {
    if (!pending) return;
    void runAssign(pending);
  };

  const onBackFromConfirm = () => {
    setPending(null);
    setStep("pick");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("branch.assignPersonnelTitle")}
      description={t("branch.assignPersonnelHint")}
      closeButtonLabel={t("common.close")}
      wide
      wideFixedHeight
      className="max-sm:max-h-[min(100dvh,100svh)] max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0"
    >
      {step === "confirm" && pending ? (
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-6 sm:pb-6">
          <p className="text-base leading-relaxed text-zinc-800 sm:text-sm sm:text-zinc-700">
            {t("branch.assignPersonnelConfirmBody")
              .replace("{name}", pending.fullName)
              .replace("{fromBranch}", currentBranchLabel(pending))
              .replace("{toBranch}", targetBranch.name)}
          </p>
          <div className="mt-auto flex flex-col gap-2 pt-6 sm:mt-4 sm:flex-row sm:justify-end sm:pt-4">
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
          </div>
          {filtered.length === 0 ? (
            <p className="mt-3 shrink-0 text-sm text-zinc-500">{t("branch.assignPersonnelEmpty")}</p>
          ) : (
            <>
              <div className="mt-3 min-h-[min(42dvh,15rem)] flex-1 overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 md:hidden">
                <ul className="divide-y divide-zinc-100">
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full touch-manipulation items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-zinc-100",
                          selectedId === p.id ? "bg-violet-50" : "hover:bg-zinc-50"
                        )}
                        onClick={() => setSelectedId(p.id)}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                            selectedId === p.id
                              ? "border-violet-600 bg-violet-600"
                              : "border-zinc-300 bg-white"
                          )}
                          aria-hidden
                        >
                          {selectedId === p.id ? (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          ) : null}
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
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 hidden min-h-0 min-h-[16rem] flex-1 overflow-auto overscroll-contain rounded-xl border border-zinc-200 md:block">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="w-[1%]">
                        <span className="sr-only">{t("branch.assignPersonnelPick")}</span>
                      </TableHeader>
                      <TableHeader>{t("branch.staffName")}</TableHeader>
                      <TableHeader className="min-w-[8rem]">
                        {t("branch.assignPersonnelCurrentBranch")}
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow
                        key={p.id}
                        className={cn(
                          "cursor-pointer min-h-[48px]",
                          selectedId === p.id && "bg-violet-50/80"
                        )}
                        onClick={() => setSelectedId(p.id)}
                      >
                        <TableCell className="w-[1%] align-middle">
                          <input
                            type="radio"
                            className="h-4 w-4 shrink-0"
                            checked={selectedId === p.id}
                            onChange={() => setSelectedId(p.id)}
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
                    ))}
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
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto sm:min-w-[120px]"
              disabled={selected == null || updatePersonnel.isPending}
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
