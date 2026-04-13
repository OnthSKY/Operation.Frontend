"use client";

import { compareValues, rowMatchesQuery, type SortDir } from "@/modules/reports/lib/report-table-utils";
import { useMemo, useState, type ReactNode } from "react";

export type SortOption<K extends string> = { id: K; label: string };

type TFn = (key: string) => string;

function ReportSectionToolbar<K extends string>({
  query,
  onQueryChange,
  sortKey,
  onSortKeyChange,
  sortDir,
  onToggleSortDir,
  sortOptions,
  shown,
  total,
  t,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  sortKey: K;
  onSortKeyChange: (k: K) => void;
  sortDir: SortDir;
  onToggleSortDir: () => void;
  sortOptions: SortOption<K>[];
  shown: number;
  total: number;
  t: TFn;
}) {
  return (
    <div
      className="mb-3 flex flex-col gap-2 border-b border-zinc-100 pb-3 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3 sm:pb-3.5"
      role="search"
    >
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
          {t("reports.sectionFilter")}
        </span>
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("reports.sectionSearchPlaceholder")}
          className="min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 sm:min-h-10 sm:text-sm"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 sm:w-[min(100%,14rem)]">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
          {t("reports.sectionSortBy")}
        </span>
        <select
          value={sortKey}
          onChange={(e) => onSortKeyChange(e.target.value as K)}
          className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base sm:min-h-10 sm:text-sm"
        >
          {sortOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onToggleSortDir}
          className="min-h-11 min-w-11 touch-manipulation rounded-lg border border-zinc-200 bg-white px-2 text-base font-semibold leading-none text-zinc-800 shadow-sm sm:min-h-10 sm:min-w-10 sm:text-sm"
          aria-label={
            sortDir === "asc" ? t("reports.sortDescAria") : t("reports.sortAscAria")
          }
          title={
            sortDir === "asc" ? t("reports.sortStateDesc") : t("reports.sortStateAsc")
          }
        >
          <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span>
        </button>
        <p className="pb-2 text-xs tabular-nums text-zinc-500 sm:pb-2.5">
          {t("reports.sectionShowing")
            .replace("{{shown}}", String(shown))
            .replace("{{total}}", String(total))}
        </p>
      </div>
    </div>
  );
}

export function ReportInteractiveRows<T, K extends string>({
  interactive,
  rows,
  defaultSortKey,
  sortOptions,
  getSortValue,
  getSearchHaystack,
  t,
  children,
}: {
  interactive: boolean;
  rows: readonly T[];
  defaultSortKey: K;
  sortOptions: SortOption<K>[];
  getSortValue: (row: T, key: K) => string | number;
  getSearchHaystack: (row: T) => string;
  t: TFn;
  children: (ctx: {
    displayRows: T[];
    toolbar: ReactNode;
    emptyFiltered: boolean;
  }) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<K>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { displayRows, emptyFiltered } = useMemo(() => {
    if (!interactive) {
      return { displayRows: [...rows], emptyFiltered: false };
    }
    const filtered = rows.filter((r) =>
      rowMatchesQuery(getSearchHaystack(r), query)
    );
    const hadRows = rows.length > 0;
    const emptyFiltered = hadRows && filtered.length === 0;
    const sorted = [...filtered].sort((a, b) =>
      compareValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir)
    );
    return { displayRows: sorted, emptyFiltered };
  }, [
    interactive,
    rows,
    query,
    sortKey,
    sortDir,
    getSortValue,
    getSearchHaystack,
  ]);

  const toolbar = interactive ? (
    <ReportSectionToolbar
      query={query}
      onQueryChange={setQuery}
      sortKey={sortKey}
      onSortKeyChange={setSortKey}
      sortDir={sortDir}
      onToggleSortDir={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
      sortOptions={sortOptions}
      shown={displayRows.length}
      total={rows.length}
      t={t}
    />
  ) : null;

  return <>{children({ displayRows, toolbar, emptyFiltered })}</>;
}
