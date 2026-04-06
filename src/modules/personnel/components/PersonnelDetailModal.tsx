"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { PersonnelManagementSnapshotSection } from "@/modules/personnel/components/PersonnelManagementSnapshotSection";
import {
  usePersonnelAdvancesAll,
  usePersonnelManagementSnapshot,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { fetchWarehouses } from "@/modules/warehouse/api/warehouses-api";
import {
  useUpdateWarehouse,
  warehouseKeys,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import type { Advance } from "@/types/advance";
import type { Personnel } from "@/types/personnel";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

const TITLE_ID = "personnel-detail-modal-title";
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type TabId = "advances" | "roles";

function formatHireDate(p: Personnel, dash: string, locale: Locale): string {
  if (!p.hireDate) return dash;
  return formatLocaleDate(p.hireDate, locale, dash);
}

function formatSalary(p: Personnel, dash: string, locale: Locale): string {
  if (p.salary == null) return dash;
  return formatMoneyDash(p.salary, dash, locale);
}

function formatAdvanceDay(iso: string, locale: Locale, dash: string): string {
  return formatLocaleDate(iso, locale, dash);
}

function sortAdvancesDesc(rows: Advance[]): Advance[] {
  return [...rows].sort((a, b) => {
    const da = a.advanceDate.slice(0, 10);
    const db = b.advanceDate.slice(0, 10);
    if (da !== db) return db.localeCompare(da);
    return b.id - a.id;
  });
}

function sourceAbbrev(t: (k: string) => string, st: string): string {
  const u = st.toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  if (u === "PERSONNEL_POCKET") return t("personnel.advanceSourceAbbrPersonnelPocket");
  return t("personnel.advanceSourceAbbrCash");
}

function PassiveBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-zinc-300/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-800">
      {children}
    </span>
  );
}

function normalizePositiveUserId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function hasLinkedSystemUser(p: Personnel): boolean {
  return normalizePositiveUserId(p.userId) != null;
}

function depotRolePhrase(tags: readonly string[], t: (k: string) => string): string {
  const hasM = tags.includes("manager");
  const hasS = tags.includes("master");
  if (hasM && hasS) return t("personnel.detailRolesStoryDepotRolesBoth");
  if (hasM) return t("personnel.detailRolesStoryDepotRolesManager");
  return t("personnel.detailRolesStoryDepotRolesMaster");
}

type Props = {
  open: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  branchNameById: Map<number, string>;
};

export function PersonnelDetailModal({
  open,
  onClose,
  personnel,
  branchNameById,
}: Props) {
  const { t, locale } = useI18n();
  const dash = t("personnel.dash");
  const [tab, setTab] = useState<TabId>("advances");
  const [yearInput, setYearInput] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [advPage, setAdvPage] = useState(1);
  const [advPageSize, setAdvPageSize] = useState(String(PAGE_SIZE_OPTIONS[0]));
  const [rolesSearch, setRolesSearch] = useState("");
  const debouncedRolesSearch = useDebouncedValue(rolesSearch.trim(), 200);
  const [assignWarehouseId, setAssignWarehouseId] = useState("");
  const [assignRole, setAssignRole] = useState<"manager" | "master" | "both">("manager");
  const updateWhMut = useUpdateWarehouse();

  const pid = personnel?.id ?? 0;
  const {
    data: advancesRaw = [],
    isPending: advLoading,
    isError: advError,
    error: advErr,
  } = usePersonnelAdvancesAll(open && pid > 0 ? pid : null);

  const {
    data: mgmtSnap,
    isPending: mgmtSnapLoading,
    isError: mgmtSnapError,
    error: mgmtSnapErr,
  } = usePersonnelManagementSnapshot(open && pid > 0 ? pid : null, open && pid > 0);

  const handoverCashRows = useMemo(() => {
    if (!mgmtSnap) return [];
    return mgmtSnap.byCurrency.filter((r) => r.totalCashHandoverAsResponsibleAllTime > 0);
  }, [mgmtSnap]);

  const primaryHandoverRow = useMemo(() => {
    if (!mgmtSnap || handoverCashRows.length === 0) return null;
    const pc = mgmtSnap.primaryCurrencyCode?.trim().toUpperCase() || "TRY";
    return (
      handoverCashRows.find((r) => r.currencyCode.toUpperCase() === pc) ?? handoverCashRows[0]
    );
  }, [mgmtSnap, handoverCashRows]);

  const handoverOtherCurrenciesLine = useMemo(() => {
    if (!primaryHandoverRow || handoverCashRows.length <= 1) return "";
    const rest = handoverCashRows.filter(
      (r) => r.currencyCode.toUpperCase() !== primaryHandoverRow.currencyCode.toUpperCase()
    );
    return rest
      .map((r) => {
        const amt = formatMoneyDash(
          r.totalCashHandoverAsResponsibleAllTime,
          dash,
          locale,
          r.currencyCode
        );
        return `${r.currencyCode} ${amt}`;
      })
      .join(" · ");
  }, [primaryHandoverRow, handoverCashRows, dash, locale]);

  const orderedLinkedBranchIds = useMemo(() => {
    const raw = mgmtSnap?.linkedBranchIds ?? [];
    const bid = personnel?.branchId;
    if (bid != null && bid > 0 && raw.includes(bid)) {
      const rest = raw.filter((id) => id !== bid).sort((a, b) => a - b);
      return [bid, ...rest];
    }
    return [...raw].sort((a, b) => a - b);
  }, [mgmtSnap?.linkedBranchIds, personnel?.branchId]);

  const { data: warehouses = [], isPending: whLoading } = useQuery({
    queryKey: warehouseKeys.list(),
    queryFn: fetchWarehouses,
    enabled: open && personnel != null && tab === "roles",
  });

  useEffect(() => {
    if (!open || !personnel) return;
    setTab("advances");
    setYearInput("");
    setBranchFilter("");
    setSourceFilter("");
    setAdvPage(1);
    setRolesSearch("");
    setAssignWarehouseId("");
    setAssignRole("manager");
  }, [open, personnel?.id]);

  useEffect(() => {
    setAdvPage(1);
  }, [yearInput, branchFilter, sourceFilter, advPageSize]);

  const branchOptions = useMemo(
    () => [
      { value: "", label: t("personnel.detailAdvancesAnyBranch") },
      ...[...branchNameById.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], locale === "tr" ? "tr" : "en"))
        .map(([id, name]) => ({ value: String(id), label: name })),
    ],
    [branchNameById, locale, t]
  );

  const sourceOptions = useMemo(
    () => [
      { value: "", label: t("personnel.detailSourceAll") },
      { value: "CASH", label: t("personnel.sourceCash") },
      { value: "PATRON", label: t("personnel.sourcePatron") },
      { value: "BANK", label: t("personnel.sourceBank") },
      { value: "PERSONNEL_POCKET", label: t("personnel.sourcePersonnelPocket") },
    ],
    [t]
  );

  const filteredAdvances = useMemo(() => {
    let rows = sortAdvancesDesc(advancesRaw);
    const y = yearInput.trim();
    if (y) {
      const yn = parseInt(y, 10);
      if (Number.isFinite(yn) && yn >= 1900 && yn <= 9999) {
        rows = rows.filter((a) => a.effectiveYear === yn);
      }
    }
    const br = branchFilter.trim();
    if (br) {
      const bid = parseInt(br, 10);
      if (Number.isFinite(bid) && bid > 0) {
        rows = rows.filter((a) => a.branchId === bid);
      }
    }
    const sf = sourceFilter.trim().toUpperCase();
    if (
      sf === "CASH" ||
      sf === "PATRON" ||
      sf === "BANK" ||
      sf === "PERSONNEL_POCKET"
    ) {
      rows = rows.filter((a) => a.sourceType.toUpperCase() === sf);
    }
    return rows;
  }, [advancesRaw, yearInput, branchFilter, sourceFilter]);

  const advSize =
    PAGE_SIZE_OPTIONS.find((n) => String(n) === advPageSize) ?? PAGE_SIZE_OPTIONS[0];
  const advTotalPages = Math.max(1, Math.ceil(filteredAdvances.length / advSize));

  useEffect(() => {
    setAdvPage((p) => Math.min(p, advTotalPages));
  }, [advTotalPages]);

  const advSafePage = Math.min(advPage, advTotalPages);
  const advSlice = useMemo(() => {
    const start = (advSafePage - 1) * advSize;
    return filteredAdvances.slice(start, start + advSize);
  }, [filteredAdvances, advSafePage, advSize]);

  const warehouseAssignOptions = useMemo(
    () => [
      { value: "", label: t("personnel.detailRolesAssignWarehousePick") },
      ...[...warehouses]
        .sort((a, b) => a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en"))
        .map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [warehouses, locale, t]
  );

  const roleAssignOptions = useMemo(
    () => [
      { value: "manager", label: t("personnel.detailRolesAssignRoleManager") },
      { value: "master", label: t("personnel.detailRolesAssignRoleMaster") },
      { value: "both", label: t("personnel.detailRolesAssignRoleBoth") },
    ],
    [t]
  );

  const warehouseRoles = useMemo(() => {
    const uid = normalizePositiveUserId(personnel?.userId);
    if (!uid) return [];
    const q = debouncedRolesSearch.toLowerCase();
    return warehouses
      .filter((w) => {
        const mgr = normalizePositiveUserId(w.responsibleManagerUserId);
        const mst = normalizePositiveUserId(w.responsibleMasterUserId);
        if (mgr !== uid && mst !== uid) return false;
        if (!q) return true;
        return w.name.toLowerCase().includes(q);
      })
      .map((w) => {
        const tags: string[] = [];
        if (normalizePositiveUserId(w.responsibleManagerUserId) === uid) tags.push("manager");
        if (normalizePositiveUserId(w.responsibleMasterUserId) === uid) tags.push("master");
        return { warehouse: w, tags };
      })
      .sort((a, b) => a.warehouse.name.localeCompare(b.warehouse.name, locale === "tr" ? "tr" : "en"));
  }, [warehouses, personnel?.userId, debouncedRolesSearch, locale]);

  const pageSizeSelectOptions = useMemo(
    () =>
      PAGE_SIZE_OPTIONS.map((n) => ({
        value: String(n),
        label: t("personnel.detailPageSizeOption").replace("{n}", String(n)),
      })),
    [t]
  );

  const runAssignWarehouse = async () => {
    const uid = normalizePositiveUserId(personnel?.userId);
    if (!uid || !personnel) return;
    const wid = parseInt(assignWarehouseId, 10);
    if (!Number.isFinite(wid) || wid <= 0) {
      notify.error(t("personnel.detailRolesAssignNeedWarehouse"));
      return;
    }
    const w = warehouses.find((x) => x.id === wid);
    if (!w) {
      notify.error(t("personnel.detailRolesAssignNeedWarehouse"));
      return;
    }
    let mgr =
      w.responsibleManagerUserId != null && w.responsibleManagerUserId > 0
        ? w.responsibleManagerUserId
        : null;
    let mst =
      w.responsibleMasterUserId != null && w.responsibleMasterUserId > 0
        ? w.responsibleMasterUserId
        : null;
    if (assignRole === "manager" || assignRole === "both") mgr = uid;
    if (assignRole === "master" || assignRole === "both") mst = uid;
    try {
      await updateWhMut.mutateAsync({
        id: wid,
        input: {
          name: w.name.trim(),
          address: w.address?.trim() ? w.address.trim() : null,
          city: w.city?.trim() ? w.city.trim() : null,
          responsibleManagerUserId: mgr,
          responsibleMasterUserId: mst,
        },
      });
      notify.success(t("toast.warehouseUpdated"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const showCashHandoverBanner =
    !mgmtSnapLoading &&
    !mgmtSnapError &&
    primaryHandoverRow != null &&
    primaryHandoverRow.totalCashHandoverAsResponsibleAllTime > 0 &&
    mgmtSnap != null;

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      className={cn(
        "min-h-11 flex-1 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:min-w-[8rem]",
        tab === id
          ? "border-b-2 border-zinc-900 bg-zinc-50 text-zinc-900"
          : "border-b-2 border-transparent text-zinc-600 hover:bg-zinc-50/80"
      )}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  const title = personnel ? personnelDisplayName(personnel) : t("personnel.detailTitle");

  return (
    <Modal
      open={open && personnel != null}
      onClose={onClose}
      titleId={TITLE_ID}
      title={title}
      description={
        personnel?.isDeleted ? t("personnel.detailSubtitlePassive") : undefined
      }
      closeButtonLabel={t("common.close")}
      wide
      className="flex max-h-[min(92dvh,56rem)] w-full flex-col overflow-hidden !p-0 sm:max-h-[min(88vh,60rem)] lg:max-h-[min(90dvh,68rem)] xl:max-h-[min(92dvh,76rem)]"
    >
      {!personnel ? null : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-2 sm:px-6">
          <article
            className={cn(
              "mb-3 shrink-0 rounded-2xl border p-4 shadow-sm",
              personnel.isDeleted
                ? "border-zinc-200/90 bg-zinc-100/50"
                : "border-zinc-200 bg-white"
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  "text-base font-semibold text-zinc-900",
                  personnel.isDeleted && "text-zinc-600"
                )}
              >
                {personnelDisplayName(personnel)}
              </h3>
              {personnel.isDeleted ? (
                <PassiveBadge>{t("personnel.badgePassive")}</PassiveBadge>
              ) : null}
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                <dt className="text-zinc-500">{t("personnel.tableJobTitle")}</dt>
                <dd className="font-medium text-zinc-900 sm:text-left">
                  {t(`personnel.jobTitles.${personnel.jobTitle}`)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                <dt className="text-zinc-500">{t("personnel.tableHireDate")}</dt>
                <dd className="font-medium text-zinc-900 sm:text-left">
                  {formatHireDate(personnel, dash, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                <dt className="text-zinc-500">{t("personnel.tableSalary")}</dt>
                <dd className="font-medium text-zinc-900 sm:text-left">
                  {formatSalary(personnel, dash, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 sm:block sm:space-y-1">
                <dt className="text-zinc-500">{t("personnel.tableBranch")}</dt>
                <dd className="font-medium text-zinc-900 sm:text-left">
                  {personnel.branchId != null
                    ? (branchNameById.get(personnel.branchId) ?? `#${personnel.branchId}`)
                    : dash}
                </dd>
              </div>
              {primaryHandoverRow &&
              primaryHandoverRow.totalCashHandoverAsResponsibleAllTime > 0 ? (
                <div className="flex justify-between gap-3 sm:col-span-2 sm:block sm:space-y-1">
                  <dt className="text-zinc-500">
                    {t("personnel.detailProfileCashHandoverTotal")}
                  </dt>
                  <dd className="font-medium text-zinc-900 sm:text-left">
                    {formatMoneyDash(
                      primaryHandoverRow.totalCashHandoverAsResponsibleAllTime,
                      dash,
                      locale,
                      primaryHandoverRow.currencyCode
                    )}
                    {mgmtSnap && mgmtSnap.cashHandoverResponsibleRecordCount > 0
                      ? ` · ${t("personnel.detailProfileCashHandoverCount").replace(
                          "{n}",
                          String(mgmtSnap.cashHandoverResponsibleRecordCount)
                        )}`
                      : null}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 sm:col-span-2 sm:block sm:space-y-1">
                <dt className="text-zinc-500">{t("personnel.tableSystemUser")}</dt>
                <dd
                  className="truncate font-medium text-zinc-900 sm:text-left"
                  title={
                    hasLinkedSystemUser(personnel) && personnel.username
                      ? personnel.username
                      : undefined
                  }
                >
                  {hasLinkedSystemUser(personnel) && personnel.username
                    ? personnel.username
                    : t("personnel.systemUserNone")}
                </dd>
              </div>
            </dl>
          </article>

          {showCashHandoverBanner && primaryHandoverRow && mgmtSnap && personnel ? (
            <div
              className="mb-3 shrink-0 rounded-2xl border-2 border-sky-600 bg-gradient-to-br from-sky-100 via-sky-50 to-cyan-50 p-4 shadow-lg shadow-sky-900/15 ring-2 ring-sky-500/45 sm:p-5"
              role="status"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-sky-950/90">
                {t("personnel.detailCashHandoverBannerTitle")}
              </p>
              <p className="mt-2 text-base font-semibold leading-snug text-sky-950 sm:text-lg">
                {t("personnel.detailCashHandoverBannerLead")
                  .replace("{name}", personnelDisplayName(personnel))
                  .replace(
                    "{total}",
                    formatMoneyDash(
                      primaryHandoverRow.totalCashHandoverAsResponsibleAllTime,
                      dash,
                      locale,
                      primaryHandoverRow.currencyCode
                    )
                  )
                  .replace("{ccy}", primaryHandoverRow.currencyCode)}
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-sky-950/90">
                {t("personnel.detailCashHandoverBannerSub")
                  .replace("{year}", String(mgmtSnap.currentCalendarYear))
                  .replace(
                    "{ytd}",
                    formatMoneyDash(
                      primaryHandoverRow.totalCashHandoverAsResponsibleYearToDate,
                      dash,
                      locale,
                      primaryHandoverRow.currencyCode
                    )
                  )
                  .replace("{count}", String(mgmtSnap.cashHandoverResponsibleRecordCount))}
              </p>
              {handoverOtherCurrenciesLine ? (
                <p className="mt-2 text-xs font-medium text-sky-950/85">
                  {t("personnel.detailCashHandoverBannerOther").replace(
                    "{list}",
                    handoverOtherCurrenciesLine
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          <PersonnelManagementSnapshotSection personnel={personnel} open={open} />

          <div
            role="tablist"
            className="flex shrink-0 flex-wrap gap-1 border-b border-zinc-200"
          >
            {tabBtn("advances", t("personnel.detailTabAdvances"))}
            {tabBtn("roles", t("personnel.detailTabRoles"))}
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
            {tab === "advances" ? (
              <div className="space-y-4 pb-2">
                <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3 sm:p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("personnel.detailAdvancesFilters")}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Input
                      name="advYear"
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
                      name="advBranch"
                      label={t("personnel.tableBranch")}
                      options={branchOptions}
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                      onBlur={() => {}}
                    />
                    <Select
                      name="advSource"
                      label={t("personnel.sourceType")}
                      options={sourceOptions}
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      onBlur={() => {}}
                    />
                    <Select
                      name="advPageSize"
                      label={t("personnel.detailPageSize")}
                      options={pageSizeSelectOptions}
                      value={advPageSize}
                      onChange={(e) => setAdvPageSize(e.target.value)}
                      onBlur={() => {}}
                    />
                  </div>
                </div>

                {advLoading ? (
                  <p className="text-sm text-zinc-500">{t("common.loading")}</p>
                ) : advError ? (
                  <p className="text-sm text-red-600">{toErrorMessage(advErr)}</p>
                ) : filteredAdvances.length === 0 ? (
                  <p className="text-sm text-zinc-500">{t("personnel.advanceHistoryEmpty")}</p>
                ) : (
                  <>
                    <div className="md:hidden space-y-3">
                      {advSlice.map((a) => (
                        <article
                          key={a.id}
                          className="rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-sm"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="tabular-nums text-zinc-800">
                              {formatAdvanceDay(a.advanceDate, locale, dash)}
                            </span>
                            <span className="font-mono font-medium text-zinc-900">
                              {formatMoneyDash(a.amount, dash, locale, a.currencyCode)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">
                            {branchNameById.get(a.branchId) ?? `#${a.branchId}`} ·{" "}
                            {sourceAbbrev(t, a.sourceType)} · {a.effectiveYear}
                          </p>
                          {a.description?.trim() ? (
                            <p className="mt-1 text-xs text-zinc-600">{a.description.trim()}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                      <Table className="min-w-[42rem]">
                        <TableHead>
                          <TableRow>
                            <TableHeader>{t("personnel.advanceDate")}</TableHeader>
                            <TableHeader>{t("personnel.tableBranch")}</TableHeader>
                            <TableHeader className="text-right">{t("personnel.amount")}</TableHeader>
                            <TableHeader>{t("personnel.advanceCurrency")}</TableHeader>
                            <TableHeader>{t("personnel.sourceType")}</TableHeader>
                            <TableHeader>{t("personnel.effectiveYear")}</TableHeader>
                            <TableHeader>{t("personnel.note")}</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {advSlice.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatAdvanceDay(a.advanceDate, locale, dash)}
                              </TableCell>
                              <TableCell>
                                {branchNameById.get(a.branchId) ?? `#${a.branchId}`}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatMoneyDash(a.amount, dash, locale, a.currencyCode)}
                              </TableCell>
                              <TableCell>{a.currencyCode}</TableCell>
                              <TableCell>{sourceAbbrev(t, a.sourceType)}</TableCell>
                              <TableCell className="tabular-nums">{a.effectiveYear}</TableCell>
                              <TableCell className="max-w-[14rem] text-zinc-600">
                                {a.description?.trim() || dash}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-zinc-500">
                        {t("personnel.detailShowing")
                          .replace("{from}", String((advSafePage - 1) * advSize + 1))
                          .replace(
                            "{to}",
                            String(Math.min(advSafePage * advSize, filteredAdvances.length))
                          )
                          .replace("{total}", String(filteredAdvances.length))}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10"
                          disabled={advSafePage <= 1}
                          onClick={() => setAdvPage((p) => Math.max(1, p - 1))}
                        >
                          {t("personnel.detailPrev")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10"
                          disabled={advSafePage >= advTotalPages}
                          onClick={() => setAdvPage((p) => Math.min(advTotalPages, p + 1))}
                        >
                          {t("personnel.detailNext")}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4 pb-2">
                <div className="rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50/90 to-white p-4 shadow-sm shadow-zinc-900/5">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {t("personnel.detailRolesStoryTitle")}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {t("personnel.detailRolesStoryIntroPerson").replace(
                      "{name}",
                      personnelDisplayName(personnel)
                    )}
                  </p>
                </div>

                <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("personnel.detailRolesBranchesListTitle")}
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    {t("personnel.detailRolesBranchesListIntro")}
                  </p>
                  {mgmtSnapLoading && orderedLinkedBranchIds.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
                  ) : null}
                  {mgmtSnapError ? (
                    <p className="mt-3 text-sm text-red-600">{toErrorMessage(mgmtSnapErr)}</p>
                  ) : null}
                  {!mgmtSnapLoading && !mgmtSnapError && orderedLinkedBranchIds.length === 0 ? (
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                      {t("personnel.detailRolesBranchesEmpty")}
                    </p>
                  ) : null}
                  {!mgmtSnapLoading && !mgmtSnapError && orderedLinkedBranchIds.length > 0 ? (
                    <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-zinc-800 marker:text-zinc-400">
                      {orderedLinkedBranchIds.map((branchId) => {
                        const nm = branchNameById.get(branchId) ?? `#${branchId}`;
                        const isCurrent = personnel.branchId === branchId;
                        const roleLabel = t(`personnel.jobTitles.${personnel.jobTitle}`);
                        return (
                          <li key={branchId} className="pl-1">
                            <span className="text-zinc-900">
                              {t("personnel.detailRolesBranchItem").replace("{name}", nm)}
                            </span>
                            {isCurrent ? (
                              <>
                                <span className="ml-2 inline-flex rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-900">
                                  {t("personnel.detailRolesBranchCurrentTag")}
                                </span>
                                <span className="ml-2 text-zinc-700">
                                  · {t("personnel.detailRolesBranchCurrentRole").replace("{role}", roleLabel)}
                                </span>
                              </>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                </section>

                <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("personnel.detailRolesWarehousesListTitle")}
                  </h4>

                  {!hasLinkedSystemUser(personnel) ? (
                    <div className="mt-3 space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
                      <p className="text-sm font-semibold text-amber-950">
                        {t("personnel.detailRolesWarehouseNeedUserTitle")}
                      </p>
                      <p className="text-sm leading-relaxed text-amber-950/90">
                        {t("personnel.detailRolesWarehouseNeedUserP1")}
                      </p>
                      <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed text-amber-950/90">
                        <li>{t("personnel.detailRolesWarehouseNeedUserStep1")}</li>
                        <li>{t("personnel.detailRolesWarehouseNeedUserStep2")}</li>
                      </ol>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 rounded-xl border border-violet-200/80 bg-violet-50/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/85">
                          {t("personnel.detailRolesAssignWarehouseTitle")}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                          {t("personnel.detailRolesAssignWarehouseIntro")}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Select
                            name="assignWh"
                            label={t("personnel.detailRolesAssignWarehouseSelect")}
                            labelRequired
                            options={warehouseAssignOptions}
                            value={assignWarehouseId}
                            onChange={(e) => setAssignWarehouseId(e.target.value)}
                            onBlur={() => {}}
                            disabled={whLoading}
                          />
                          <Select
                            name="assignRole"
                            label={t("personnel.detailRolesAssignRoleLabel")}
                            options={roleAssignOptions}
                            value={assignRole}
                            onChange={(e) =>
                              setAssignRole(e.target.value as "manager" | "master" | "both")
                            }
                            onBlur={() => {}}
                            disabled={whLoading}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-3 min-h-10"
                          disabled={updateWhMut.isPending || whLoading}
                          onClick={() => void runAssignWarehouse()}
                        >
                          {t("personnel.detailRolesAssignApply")}
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0 sm:max-w-xs sm:flex-1 sm:ml-auto">
                          <Input
                            name="rolesSearch"
                            label={t("personnel.detailRolesSearchShort")}
                            placeholder={t("personnel.fieldOptionalPlaceholder")}
                            value={rolesSearch}
                            onChange={(e) => setRolesSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                        {t("personnel.detailRolesStoryWarehouseHint")}
                      </p>

                      {whLoading ? (
                        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
                      ) : warehouseRoles.length === 0 ? (
                        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                          {debouncedRolesSearch
                            ? t("personnel.detailRolesStoryNoDepotsMatch")
                            : t("personnel.detailRolesStoryNoDepots")}
                        </p>
                      ) : (
                        <ol className="mt-4 list-decimal space-y-3 pl-4 text-sm leading-relaxed text-zinc-800 marker:text-zinc-400">
                          {warehouseRoles.map(({ warehouse: w, tags }) => (
                            <li key={w.id} className="pl-1">
                              <span className="text-zinc-900">
                                {t("personnel.detailRolesStoryDepotLine")
                                  .replace("{warehouse}", w.name)
                                  .replace("{roles}", depotRolePhrase(tags, t))}
                              </span>
                              {w.city?.trim() || w.address?.trim() ? (
                                <span className="mt-1 block text-xs text-zinc-500">
                                  {[w.city?.trim(), w.address?.trim()].filter(Boolean).join(" · ")}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      )}
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
