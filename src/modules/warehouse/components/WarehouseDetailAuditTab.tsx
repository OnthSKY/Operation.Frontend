"use client";

import { useWarehouseAuditPage } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Select, type SelectOption } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { cn } from "@/lib/cn";
import type { WarehouseAuditItem, WarehouseAuditPageParams } from "@/types/warehouse";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const PAGE_SIZE = 20;

function auditKv(label: string, value: ReactNode) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 break-words font-mono text-sm text-zinc-900">{value}</p>
    </div>
  );
}

function AuditPayloadBlock({ row, t }: { row: WarehouseAuditItem; t: (key: string) => string }) {
  const whUpdate = row.tableName === "warehouses" && row.action === "UPDATE";
  return (
    <div className="min-w-0 space-y-2">
      {whUpdate && (row.oldDataJson || row.newDataJson) ? (
        <details className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-2 text-xs">
          <summary className="cursor-pointer touch-manipulation font-medium text-amber-900">
            {t("warehouse.auditOldNewSummary")}
          </summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase text-zinc-500">
                {t("warehouse.auditColOld")}
              </p>
              <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-all rounded border border-zinc-200 bg-white p-2 text-[10px] text-zinc-800 [-webkit-overflow-scrolling:touch]">
                {row.oldDataJson ?? "—"}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-zinc-500">
                {t("warehouse.auditColNew")}
              </p>
              <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-all rounded border border-amber-200 bg-amber-50/80 p-2 text-[10px] text-zinc-900 [-webkit-overflow-scrolling:touch]">
                {row.newDataJson ?? "—"}
              </pre>
            </div>
          </div>
        </details>
      ) : null}
      <details className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-2 text-xs">
        <summary className="cursor-pointer touch-manipulation font-medium text-zinc-800">
          {t("warehouse.auditShowJson")}
        </summary>
        <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2 text-[10px] text-zinc-800 [-webkit-overflow-scrolling:touch]">
          {row.newDataJson ?? row.oldDataJson ?? "—"}
        </pre>
      </details>
    </div>
  );
}

type Props = {
  warehouseId: number;
  enabled: boolean;
};

export function WarehouseDetailAuditTab({ warehouseId, enabled }: Props) {
  const { t, locale } = useI18n();
  const [scope, setScope] = useState<"" | "all" | "warehouses" | "warehouse_movements">("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setScope("");
    setPage(1);
  }, [warehouseId]);

  useEffect(() => {
    setPage(1);
  }, [scope]);

  const params = useMemo((): WarehouseAuditPageParams => {
    const s =
      scope === "warehouses" || scope === "warehouse_movements" ? scope : undefined;
    return { page, pageSize: PAGE_SIZE, scope: s };
  }, [page, scope]);

  const { data, isPending, isError, error, refetch } = useWarehouseAuditPage(
    warehouseId,
    params,
    enabled
  );

  const scopeOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.auditScopeAll") },
      { value: "warehouses", label: t("warehouse.auditScopeWarehouses") },
      { value: "warehouse_movements", label: t("warehouse.auditScopeMovements") },
    ],
    [t]
  );

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const items = data?.items ?? [];

  const fmtDt = (iso: string) => formatLocaleDateTime(iso, locale);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p className="text-sm text-zinc-500">{t("warehouse.auditHint")}</p>
      <p className="text-xs font-medium text-amber-800">{t("warehouse.auditWarehouseUpdateHint")}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <Select
            label={t("warehouse.auditScopeLabel")}
            options={scopeOptions}
            value={scope}
            onChange={(e) =>
              setScope(
                (e.target.value || "") as
                  | ""
                  | "all"
                  | "warehouses"
                  | "warehouse_movements"
              )
            }
            onBlur={() => {}}
            name="wh-audit-scope"
          />
        </div>
        <Button type="button" variant="secondary" className="min-h-12 w-full sm:w-auto" onClick={() => refetch()}>
          {t("products.filterApplyRefresh")}
        </Button>
      </div>

      {isError && <p className="text-sm text-red-600">{toErrorMessage(error)}</p>}

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-600">{t("warehouse.auditEmpty")}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:hidden">
            {items.map((row) => {
              const whUpdate = row.tableName === "warehouses" && row.action === "UPDATE";
              return (
                <div
                  key={row.id}
                  className={cn(
                    "touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5",
                    whUpdate &&
                      "border-amber-300 bg-amber-50/40 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
                  )}
                >
                  <p className="text-xs leading-relaxed text-zinc-600">{fmtDt(row.createdAt)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-sm font-semibold text-zinc-900">
                      {row.tableName}
                    </span>
                    {whUpdate ? (
                      <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {t("warehouse.auditBadgeWarehouseEdit")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {auditKv(t("warehouse.auditColAction"), row.action)}
                    {auditKv(t("warehouse.auditColRecord"), row.recordId ?? "—")}
                  </div>
                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("warehouse.auditColPayload")}
                    </p>
                    <AuditPayloadBlock row={row} t={t} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden max-h-[min(50vh,420px)] overflow-auto rounded-lg border border-zinc-200 md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("warehouse.auditColTime")}</TableHeader>
                  <TableHeader>{t("warehouse.auditColTable")}</TableHeader>
                  <TableHeader>{t("warehouse.auditColAction")}</TableHeader>
                  <TableHeader>{t("warehouse.auditColRecord")}</TableHeader>
                  <TableHeader>{t("warehouse.auditColPayload")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => {
                  const whUpdate = row.tableName === "warehouses" && row.action === "UPDATE";
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        whUpdate &&
                          "border-l-4 border-amber-500 bg-amber-50 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]"
                      )}
                    >
                      <TableCell className="whitespace-nowrap text-xs text-zinc-600">
                        {fmtDt(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {row.tableName}
                          {whUpdate ? (
                            <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              {t("warehouse.auditBadgeWarehouseEdit")}
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{row.action}</TableCell>
                      <TableCell className="tabular-nums text-xs">{row.recordId ?? "—"}</TableCell>
                      <TableCell className="max-w-[min(40vw,280px)] align-top">
                        <AuditPayloadBlock row={row} t={t} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!isPending && totalCount > 0 && (
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            {(page - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(page * PAGE_SIZE, totalCount)} · {t("products.pagingTotal")} {totalCount}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("products.pagingPrev")}
            </Button>
            <span className="text-sm tabular-nums text-zinc-700">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("products.pagingNext")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
