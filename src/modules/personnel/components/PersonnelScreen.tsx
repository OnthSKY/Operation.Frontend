"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { usePersonnelList } from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Card } from "@/shared/components/Card";
import { Button } from "@/shared/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { useHashScroll } from "@/shared/lib/use-hash-scroll";
import type { Personnel } from "@/types/personnel";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AdvancePersonnelModal } from "./AdvancePersonnelModal";
import { PersonnelAdvanceHistory } from "./PersonnelAdvanceHistory";
import { PersonnelFormModal } from "./PersonnelFormModal";
import { SoftDeletePersonnelModal } from "./SoftDeletePersonnelModal";

function formatHireDate(p: Personnel, dash: string): string {
  if (!p.hireDate) return dash;
  return new Date(p.hireDate + "T12:00:00").toLocaleDateString();
}

function formatSalary(p: Personnel, dash: string, locale: Locale): string {
  if (p.salary == null) return dash;
  return formatMoneyDash(p.salary, dash, locale);
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl bg-zinc-100 md:h-14"
        />
      ))}
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function CoinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M12 14v8M9 21h6" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  );
}

function PersonnelIconActions({
  p,
  onEdit,
  onDeactivate,
  onAdvance,
  editLabel,
  deactivateLabel,
  advanceLabel,
}: {
  p: Personnel;
  onEdit: () => void;
  onDeactivate: () => void;
  onAdvance?: () => void;
  editLabel: string;
  deactivateLabel: string;
  advanceLabel?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-200/80 hover:text-zinc-900 active:bg-zinc-300/60"
      >
        <PencilIcon />
      </button>
      {!p.isDeleted && onAdvance ? (
        <button
          type="button"
          onClick={onAdvance}
          aria-label={advanceLabel ?? "Advance"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-emerald-700 transition-colors hover:bg-emerald-50 active:bg-emerald-100"
        >
          <CoinIcon />
        </button>
      ) : null}
      {!p.isDeleted ? (
        <button
          type="button"
          onClick={onDeactivate}
          aria-label={deactivateLabel}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 active:bg-red-100"
        >
          <TrashIcon />
        </button>
      ) : null}
    </div>
  );
}

function PassiveBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-zinc-300/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-800">
      {children}
    </span>
  );
}

export function PersonnelScreen() {
  const { t, locale } = useI18n();
  useHashScroll();
  const { data, isPending, isError, error, refetch } = usePersonnelList();
  const { data: branches = [] } = useBranchesList();
  const branchNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);
  const list = useMemo(() => data ?? [], [data]);
  const activePersonnel = useMemo(
    () => list.filter((p) => !p.isDeleted),
    [list]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Personnel | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceInitialPersonId, setAdvanceInitialPersonId] = useState<
    number | null
  >(null);
  const [softDeleteOpen, setSoftDeleteOpen] = useState(false);
  const [softDeleteTarget, setSoftDeleteTarget] = useState<Personnel | null>(
    null
  );

  const openCreate = () => {
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (p: Personnel) => {
    setFormInitial(p);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormInitial(null);
  };

  const openSoftDelete = (p: Personnel) => {
    setSoftDeleteTarget(p);
    setSoftDeleteOpen(true);
  };

  const closeSoftDelete = () => {
    setSoftDeleteOpen(false);
    setSoftDeleteTarget(null);
  };

  const openAdvance = (personnelId?: number) => {
    setAdvanceInitialPersonId(
      personnelId != null && personnelId > 0 ? personnelId : null
    );
    setAdvanceOpen(true);
  };

  const closeAdvance = () => {
    setAdvanceOpen(false);
    setAdvanceInitialPersonId(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:pb-8 lg:max-w-6xl 2xl:max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            {t("personnel.heading")}
          </h1>
          <Link
            href="/personnel/advances"
            className="mt-2 inline-block text-sm font-semibold text-violet-700 hover:text-violet-900 hover:underline sm:hidden"
          >
            {t("personnel.allAdvancesLink")}
          </Link>
          <details className="mt-1 text-zinc-500">
            <summary className="cursor-pointer select-none text-sm text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline">
              {t("personnel.apiDetails")}
            </summary>
            <p className="mt-2 rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600">
              {t("personnel.apiHint")}{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px]">
                /api/personnel
              </code>
            </p>
          </details>
        </div>
        <div className="hidden flex-col gap-2 sm:flex sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={openCreate}>
            {t("personnel.add")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => openAdvance()}
            disabled={activePersonnel.length === 0}
          >
            {t("personnel.advance")}
          </Button>
          <Link
            href="/personnel/advances"
            className={cn(
              "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100 sm:w-auto"
            )}
          >
            {t("personnel.allAdvancesLink")}
          </Link>
        </div>
      </div>

      <div id="personnel-advance" className="scroll-mt-24">
        <Card title={t("personnel.team")} description={t("personnel.teamDesc")}>
          {isPending && <ListSkeleton label={t("common.loading")} />}
          {isError && (
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-relaxed text-red-600">
                {toErrorMessage(error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto sm:self-start"
                onClick={() => refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          )}
          {!isPending && !isError && list.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="max-w-sm text-sm text-zinc-500">
                {t("personnel.noData")}
              </p>
              <Button
                type="button"
                className="w-full max-w-xs"
                onClick={openCreate}
              >
                {t("personnel.add")}
              </Button>
            </div>
          )}
          {!isPending && !isError && list.length > 0 && (
            <>
              {/* Kartlar: tablet & mobil (< md) */}
              <div className="grid gap-3 md:hidden">
                {list.map((p) => (
                  <article
                    key={p.id}
                    className={cn(
                      "rounded-2xl border p-4 shadow-sm",
                      p.isDeleted
                        ? "border-zinc-200/90 bg-zinc-100/50"
                        : "border-zinc-200 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={cn(
                              "text-base font-semibold text-zinc-900",
                              p.isDeleted && "text-zinc-600"
                            )}
                          >
                            {personnelDisplayName(p)}
                          </h3>
                          {p.isDeleted ? (
                            <PassiveBadge>
                              {t("personnel.badgePassive")}
                            </PassiveBadge>
                          ) : null}
                        </div>
                      </div>
                      <PersonnelIconActions
                        p={p}
                        onEdit={() => openEdit(p)}
                        onDeactivate={() => openSoftDelete(p)}
                        onAdvance={
                          p.isDeleted ? undefined : () => openAdvance(p.id)
                        }
                        editLabel={t("personnel.editAriaLabel")}
                        deactivateLabel={t(
                          "personnel.softDeactivateAriaLabel"
                        )}
                        advanceLabel={t("personnel.advanceQuickAria")}
                      />
                    </div>
                    <dl className="mt-4 space-y-2.5 border-t border-zinc-200/80 pt-4 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="shrink-0 text-zinc-500">
                          {t("personnel.tableJobTitle")}
                        </dt>
                        <dd
                          className={cn(
                            "text-right font-medium text-zinc-900",
                            p.isDeleted && "text-zinc-600"
                          )}
                        >
                          {t(`personnel.jobTitles.${p.jobTitle}`)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="shrink-0 text-zinc-500">
                          {t("personnel.tableHireDate")}
                        </dt>
                        <dd
                          className={cn(
                            "text-right font-medium text-zinc-900",
                            p.isDeleted && "text-zinc-600"
                          )}
                        >
                          {formatHireDate(p, t("personnel.dash"))}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="shrink-0 text-zinc-500">
                          {t("personnel.tableSalary")}
                        </dt>
                        <dd
                          className={cn(
                            "text-right font-medium text-zinc-900",
                            p.isDeleted && "text-zinc-600"
                          )}
                        >
                          {formatSalary(p, t("personnel.dash"), locale)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="shrink-0 text-zinc-500">
                          {t("personnel.tableBranch")}
                        </dt>
                        <dd
                          className={cn(
                            "text-right font-medium text-zinc-900",
                            p.isDeleted && "text-zinc-600"
                          )}
                        >
                          {p.branchId != null
                            ? (branchNameById.get(p.branchId) ??
                              `#${p.branchId}`)
                            : t("personnel.dash")}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 border-t border-zinc-200/80 pt-3">
                      <PersonnelAdvanceHistory
                        personnelId={p.id}
                        variant="card"
                        className="text-left"
                      />
                    </div>
                  </article>
                ))}
              </div>

              {/* Tablo: md ve üstü */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("personnel.tableName")}</TableHeader>
                      <TableHeader>{t("personnel.tableJobTitle")}</TableHeader>
                      <TableHeader>{t("personnel.tableHireDate")}</TableHeader>
                      <TableHeader>{t("personnel.tableSalary")}</TableHeader>
                      <TableHeader>{t("personnel.tableBranch")}</TableHeader>
                      <TableHeader className="min-w-[12rem] max-w-[18rem]">
                        {t("personnel.tableAdvances")}
                      </TableHeader>
                      <TableHeader className="w-[1%] whitespace-nowrap text-right">
                        {t("personnel.tableActions")}
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {list.map((p) => (
                      <TableRow
                        key={p.id}
                        className={cn(p.isDeleted && "bg-zinc-50/90")}
                      >
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "font-medium text-zinc-900",
                                p.isDeleted && "text-zinc-600"
                              )}
                            >
                              {personnelDisplayName(p)}
                            </span>
                            {p.isDeleted ? (
                              <PassiveBadge>
                                {t("personnel.badgePassive")}
                              </PassiveBadge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                        >
                          {t(`personnel.jobTitles.${p.jobTitle}`)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                        >
                          {formatHireDate(p, t("personnel.dash"))}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                        >
                          {formatSalary(p, t("personnel.dash"), locale)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-zinc-600",
                            p.isDeleted && "text-zinc-500"
                          )}
                        >
                          {p.branchId != null
                            ? (branchNameById.get(p.branchId) ??
                              `#${p.branchId}`)
                            : t("personnel.dash")}
                        </TableCell>
                        <TableCell className="max-w-[18rem] align-top text-zinc-600">
                          <PersonnelAdvanceHistory
                            personnelId={p.id}
                            variant="inline"
                            maxDetailRows={4}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <PersonnelIconActions
                              p={p}
                              onEdit={() => openEdit(p)}
                              onDeactivate={() => openSoftDelete(p)}
                              onAdvance={
                                p.isDeleted ? undefined : () => openAdvance(p.id)
                              }
                              editLabel={t("personnel.editAriaLabel")}
                              deactivateLabel={t(
                                "personnel.softDeactivateAriaLabel"
                              )}
                              advanceLabel={t("personnel.advanceQuickAria")}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex gap-2 border-t border-zinc-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm sm:hidden"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Button type="button" className="flex-1" onClick={openCreate}>
          {t("personnel.add")}
        </Button>
        <Button
          type="button"
          className="flex-1"
          variant="secondary"
          disabled={activePersonnel.length === 0}
          onClick={() => openAdvance()}
        >
          {t("personnel.advance")}
        </Button>
      </div>

      <PersonnelFormModal
        open={formOpen}
        onClose={closeForm}
        initial={formInitial}
      />
      <SoftDeletePersonnelModal
        open={softDeleteOpen}
        onClose={closeSoftDelete}
        personnel={softDeleteTarget}
      />
      <AdvancePersonnelModal
        open={advanceOpen}
        onClose={closeAdvance}
        personnel={activePersonnel}
        initialPersonnelId={advanceInitialPersonId}
      />
    </div>
  );
}
