"use client";

import { cn } from "@/lib/cn";
import type { DataTableColumn } from "@/shared/tables/types";
import { mergeTableCellClasses } from "@/shared/tables/column-visibility";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/shared/ui/Table";
import type { MouseEvent } from "react";

type Props<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  tableClassName?: string;
  /** Default true; set false for nested / non-page tables. */
  mobileCards?: boolean;
  onRowClick?: (row: T) => void;
  rowClassName?: string | ((row: T) => string | undefined);
  emptyMessage?: React.ReactNode;
};

function columnDataLabel<T>(col: DataTableColumn<T>): string {
  if (col.headerTitle?.trim()) return col.headerTitle.trim();
  if (typeof col.header === "string") return col.header;
  return col.id;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  tableClassName,
  mobileCards = true,
  onRowClick,
  rowClassName,
  emptyMessage,
}: Props<T>) {
  if (rows.length === 0 && emptyMessage != null) {
    return <>{emptyMessage}</>;
  }

  return (
    <Table className={tableClassName} mobileCards={mobileCards}>
      <TableHead>
        <TableRow>
          {columns.map((col) => (
            <TableHeader
              key={col.id}
              title={col.headerTitle}
              className={mergeTableCellClasses(undefined, col.showFrom, col.thClassName)}
            >
              <span className="inline-flex items-center gap-1.5">
                {col.headerIcon ? (
                  <span className="shrink-0 text-zinc-500 [&_svg]:h-4 [&_svg]:w-4" aria-hidden>
                    {col.headerIcon}
                  </span>
                ) : null}
                {col.header}
              </span>
            </TableHeader>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const key = getRowKey(row);
          const rCls = typeof rowClassName === "function" ? rowClassName(row) : rowClassName;
          const clickable = onRowClick != null;
          return (
            <TableRow
              key={key}
              className={cn(clickable && "cursor-pointer", rCls)}
              onClick={clickable ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <DataTableBodyCell key={col.id} col={col} row={row} rowClickable={clickable} />
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DataTableBodyCell<T>({
  col,
  row,
  rowClickable,
}: {
  col: DataTableColumn<T>;
  row: T;
  rowClickable: boolean;
}) {
  const stop = rowClickable && col.isolateRowClick;
  const onClick = stop ? (e: MouseEvent<HTMLTableCellElement>) => e.stopPropagation() : undefined;

  return (
    <TableCell
      dataLabel={columnDataLabel(col)}
      className={mergeTableCellClasses(undefined, col.showFrom, col.tdClassName)}
      onClick={onClick}
    >
      {col.cell(row)}
    </TableCell>
  );
}
