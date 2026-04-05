"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
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
import { useMemo, useState } from "react";
import { AddBranchModal } from "./AddBranchModal";
import { BranchDetailPanel } from "./BranchDetailPanel";

export function BranchScreen() {
  const { t } = useI18n();
  const { data, isPending, isError, error, refetch } = useBranchesList();
  const { data: personnelData } = usePersonnelList();
  const list = useMemo(() => data ?? [], [data]);
  const personnel = useMemo(() => personnelData ?? [], [personnelData]);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = useMemo(
    () => list.find((b) => b.id === selectedId) ?? null,
    [list, selectedId]
  );

  const staff = useMemo(
    () => personnel.filter((p) => p.branchId === selectedId),
    [personnel, selectedId]
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 pb-24 sm:pb-8 lg:max-w-6xl 2xl:max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {t("branch.title")}
          </h1>
          <p className="text-sm text-zinc-500">
            {t("branch.subtitle")}{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">GET /branches</code>
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          {t("branch.add")}
        </Button>
      </div>

      <Card title={t("branch.listTitle")} description={t("branch.listDesc")}>
        {isPending && (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        )}
        {isError && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        )}
        {!isPending && !isError && list.length === 0 && (
          <p className="text-sm text-zinc-500">{t("branch.noData")}</p>
        )}
        {!isPending && !isError && list.length > 0 && (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{t("branch.tableId")}</TableHeader>
                <TableHeader>{t("branch.tableName")}</TableHeader>
                <TableHeader className="w-[1%] whitespace-nowrap text-right">
                  {t("branch.tableActions")}
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((b) => {
                const active = selectedId === b.id;
                return (
                  <TableRow
                    key={b.id}
                    className={active ? "bg-zinc-50" : undefined}
                  >
                    <TableCell className="font-mono text-zinc-600">{b.id}</TableCell>
                    <TableCell className="font-medium text-zinc-900">
                      {b.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant={active ? "primary" : "secondary"}
                        className="min-h-10 px-3 py-2 text-sm"
                        onClick={() =>
                          setSelectedId((id) => (id === b.id ? null : b.id))
                        }
                      >
                        {active ? t("branch.closeDetail") : t("branch.openDetail")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {!isPending && !isError && list.length > 0 && !selectedId && (
          <p className="mt-3 text-sm text-zinc-500">{t("branch.selectHint")}</p>
        )}
      </Card>

      {selected ? (
        <BranchDetailPanel
          branch={selected}
          staff={staff}
          onClose={() => setSelectedId(null)}
        />
      ) : null}

      <AddBranchModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
