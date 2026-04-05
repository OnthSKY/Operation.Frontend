"use client";

import { useI18n } from "@/i18n/context";
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
import { useHashScroll } from "@/shared/lib/use-hash-scroll";
import type { Personnel } from "@/types/personnel";
import { useMemo, useState } from "react";
import { AddPersonnelModal } from "./AddPersonnelModal";
import { AdvancePersonnelModal } from "./AdvancePersonnelModal";

function formatHireDate(p: Personnel, dash: string): string {
  if (!p.hireDate) return dash;
  return new Date(p.hireDate + "T12:00:00").toLocaleDateString();
}

function formatSalary(p: Personnel, dash: string): string {
  if (p.salary == null) return dash;
  return p.salary.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl bg-zinc-100 sm:h-12"
        />
      ))}
    </div>
  );
}

export function PersonnelScreen() {
  const { t } = useI18n();
  useHashScroll();
  const { data, isPending, isError, error, refetch } = usePersonnelList();
  const { data: branches = [] } = useBranchesList();
  const branchNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);
  const list = useMemo(() => data ?? [], [data]);
  const [addOpen, setAddOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:pb-8 lg:max-w-6xl 2xl:max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            {t("personnel.heading")}
          </h1>
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
        <div className="hidden flex-col gap-2 sm:flex sm:flex-row">
          <Button type="button" onClick={() => setAddOpen(true)}>
            {t("personnel.add")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAdvanceOpen(true)}
            disabled={list.length === 0}
          >
            {t("personnel.advance")}
          </Button>
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
              onClick={() => setAddOpen(true)}
            >
              {t("personnel.add")}
            </Button>
          </div>
        )}
        {!isPending && !isError && list.length > 0 && (
          <>
            <div className="space-y-3 sm:hidden">
              {list.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                >
                  <p className="text-base font-semibold text-zinc-900">
                    {personnelDisplayName(p)}
                  </p>
                  <dl className="mt-3 space-y-2.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-zinc-500">
                        {t("personnel.tableHireDate")}
                      </dt>
                      <dd className="text-right font-medium text-zinc-900">
                        {formatHireDate(p, t("personnel.dash"))}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-zinc-500">
                        {t("personnel.tableSalary")}
                      </dt>
                      <dd className="text-right font-medium text-zinc-900">
                        {formatSalary(p, t("personnel.dash"))}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-zinc-500">
                        {t("personnel.tableBranch")}
                      </dt>
                      <dd className="text-right font-medium text-zinc-900">
                        {p.branchId != null
                          ? (branchNameById.get(p.branchId) ?? `#${p.branchId}`)
                          : t("personnel.dash")}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t("personnel.tableName")}</TableHeader>
                    <TableHeader>{t("personnel.tableHireDate")}</TableHeader>
                    <TableHeader>{t("personnel.tableSalary")}</TableHeader>
                    <TableHeader>{t("personnel.tableBranch")}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-zinc-900">
                        {personnelDisplayName(p)}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {formatHireDate(p, t("personnel.dash"))}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {formatSalary(p, t("personnel.dash"))}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {p.branchId != null
                          ? (branchNameById.get(p.branchId) ?? `#${p.branchId}`)
                          : t("personnel.dash")}
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
        <Button
          type="button"
          className="flex-1"
          onClick={() => setAddOpen(true)}
        >
          {t("personnel.add")}
        </Button>
        <Button
          type="button"
          className="flex-1"
          variant="secondary"
          disabled={list.length === 0}
          onClick={() => setAdvanceOpen(true)}
        >
          {t("personnel.advance")}
        </Button>
      </div>

      <AddPersonnelModal open={addOpen} onClose={() => setAddOpen(false)} />
      <AdvancePersonnelModal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        personnel={list}
      />
    </div>
  );
}
