"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useAllAdvancesList } from "@/modules/personnel/hooks/usePersonnelQueries";
import type { AdvanceListItem } from "@/types/advance";
import { Card } from "@/shared/components/Card";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

function formatAdvanceDay(iso: string): string {
  const d = iso?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso ?? "—";
  return new Date(d + "T12:00:00").toLocaleDateString();
}

function sourceAbbrev(t: (k: string) => string, st: string): string {
  const u = st.toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  return t("personnel.advanceSourceAbbrCash");
}

function AdvanceCard({
  row,
  locale,
  t,
}: {
  row: AdvanceListItem;
  locale: Locale;
  t: (k: string) => string;
}) {
  const dash = t("personnel.dash");
  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: ReactNode;
  }) => (
    <div className="flex min-w-0 items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm text-zinc-900">{children}</span>
    </div>
  );

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-zinc-900">
            {row.personnelFullName?.trim() || dash}
          </p>
          <p className="mt-0.5 truncate text-sm text-zinc-600">
            {row.branchName?.trim() || dash}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums text-zinc-900">
            {formatMoneyDash(row.amount, dash, locale)}
          </p>
          <p className="text-xs text-zinc-500">{row.currencyCode}</p>
        </div>
      </div>
      <div className="divide-y divide-zinc-100">
        <Field label={t("personnel.advanceDate")}>
          {formatAdvanceDay(row.advanceDate)}
        </Field>
        <Field label={t("personnel.sourceType")}>
          {sourceAbbrev(t, row.sourceType)}
        </Field>
        <Field label={t("personnel.effectiveYear")}>{row.effectiveYear}</Field>
        <Field label={t("personnel.note")}>
          {row.description?.trim() ? (
            <span className="whitespace-pre-wrap break-words text-left">
              {row.description.trim()}
            </span>
          ) : (
            dash
          )}
        </Field>
      </div>
    </article>
  );
}

function AdvanceTableRow({
  row,
  locale,
  t,
}: {
  row: AdvanceListItem;
  locale: Locale;
  t: (k: string) => string;
}) {
  const dash = t("personnel.dash");
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm">
        {formatAdvanceDay(row.advanceDate)}
      </TableCell>
      <TableCell className="min-w-[8rem] text-sm font-medium text-zinc-900">
        {row.personnelFullName?.trim() || dash}
      </TableCell>
      <TableCell className="min-w-[6rem] text-sm text-zinc-700">
        {row.branchName?.trim() || dash}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
        {formatMoneyDash(row.amount, dash, locale)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-zinc-600">
        {row.currencyCode}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-zinc-600">
        {sourceAbbrev(t, row.sourceType)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm tabular-nums text-zinc-600">
        {row.effectiveYear}
      </TableCell>
      <TableCell className="max-w-[14rem] truncate text-sm text-zinc-600">
        {row.description?.trim() || dash}
      </TableCell>
    </TableRow>
  );
}

export function AllAdvancesScreen() {
  const { t, locale } = useI18n();
  const { data: branches = [] } = useBranchesList();
  const [yearInput, setYearInput] = useState("");
  const [branchValue, setBranchValue] = useState("");
  const [limitInput, setLimitInput] = useState("500");

  const listParams = useMemo(() => {
    const y = yearInput.trim();
    const yearParsed = y ? parseInt(y, 10) : NaN;
    const effectiveYear =
      Number.isFinite(yearParsed) && yearParsed >= 1900 && yearParsed <= 9999
        ? yearParsed
        : undefined;
    const br = branchValue.trim();
    const bid = br ? parseInt(br, 10) : 0;
    const lim = limitInput.trim();
    const limParsed = lim ? parseInt(lim, 10) : 500;
    const limit =
      Number.isFinite(limParsed) && limParsed >= 1 && limParsed <= 1000
        ? limParsed
        : 500;
    return {
      effectiveYear,
      branchId: bid > 0 ? bid : undefined,
      limit,
    };
  }, [yearInput, branchValue, limitInput]);

  const { data = [], isPending, isError, error, refetch } =
    useAllAdvancesList(listParams);

  const branchOptions = useMemo(
    () => [
      { value: "", label: t("personnel.allAdvancesAnyBranch") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const secondaryBtn =
    "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100 sm:w-auto";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 pb-8 lg:max-w-6xl 2xl:max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/personnel"
            className="mb-2 inline-block text-sm font-medium text-violet-700 hover:text-violet-900 hover:underline"
          >
            ← {t("personnel.allAdvancesBack")}
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            {t("personnel.allAdvancesTitle")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t("personnel.allAdvancesDesc")}
          </p>
        </div>
        <Link href="/personnel" className={cn(secondaryBtn, "shrink-0")}>
          {t("personnel.heading")}
        </Link>
      </div>

      <Card title={t("personnel.allAdvancesFilters")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            name="effectiveYear"
            label={t("personnel.allAdvancesYearOptional")}
            type="number"
            inputMode="numeric"
            min={1900}
            max={9999}
            placeholder={t("personnel.fieldOptionalPlaceholder")}
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
          />
          <Select
            name="branchFilter"
            label={t("personnel.tableBranch")}
            options={branchOptions}
            value={branchValue}
            onChange={(e) => setBranchValue(e.target.value)}
            onBlur={() => {}}
          />
          <Input
            name="limit"
            label={t("personnel.allAdvancesLimit")}
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          {t("personnel.allAdvancesLimitHint")}
        </p>
      </Card>

      <Card title={t("personnel.allAdvancesTableTitle")}>
        {isPending && (
          <p className="text-sm text-zinc-500" aria-busy="true">
            {t("common.loading")}
          </p>
        )}
        {isError && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
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
        {!isPending && !isError && data.length === 0 && (
          <p className="text-sm text-zinc-500">{t("personnel.allAdvancesEmpty")}</p>
        )}
        {!isPending && !isError && data.length > 0 && (
          <>
            <div className="grid gap-3 md:hidden" aria-label={t("personnel.allAdvancesTableTitle")}>
              {data.map((row) => (
                <AdvanceCard key={row.id} row={row} locale={locale} t={t} />
              ))}
            </div>
            <div className="hidden md:block">
              <Table className="min-w-[56rem]">
                <TableHead>
                  <TableRow>
                    <TableHeader>{t("personnel.advanceDate")}</TableHeader>
                    <TableHeader>{t("personnel.tableName")}</TableHeader>
                    <TableHeader>{t("personnel.tableBranch")}</TableHeader>
                    <TableHeader className="text-right">
                      {t("personnel.amount")}
                    </TableHeader>
                    <TableHeader>{t("personnel.advanceCurrency")}</TableHeader>
                    <TableHeader>{t("personnel.sourceType")}</TableHeader>
                    <TableHeader>{t("personnel.effectiveYear")}</TableHeader>
                    <TableHeader>{t("personnel.note")}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((row) => (
                    <AdvanceTableRow
                      key={row.id}
                      row={row}
                      locale={locale}
                      t={t}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
