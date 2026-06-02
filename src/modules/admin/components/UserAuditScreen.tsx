"use client";

import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasPermissionCode, PERM } from "@/lib/auth/permissions";
import { useUserAudit } from "@/modules/admin/hooks/useAuditQueries";
import type { AuditActivityItem } from "@/modules/admin/api/audit-api";
import {
  AUDIT_ENTITY_TABLES,
  auditActionKind,
  auditEntityLabel,
  auditRecordTarget,
  buildAuditChanges,
  describeAudit,
} from "@/modules/admin/lib/audit-describe";
import { useBranchDetailOverlay } from "@/shared/branch-detail";
import { usePersonnelDetailOverlay } from "@/shared/personnel-detail";
import { useWarehouseDetailOverlay } from "@/shared/warehouse-detail";
import { useContractorDetailOverlay } from "@/shared/contractor-detail";
import type { BranchDetailTabId } from "@/modules/branch/lib/branch-detail-tab";
import type { PersonnelDetailTabId } from "@/modules/personnel/components/PersonnelDetailModal";
import { useUsersList } from "@/modules/personnel/hooks/useUsersQueries";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { ResponsiveTableFrame } from "@/shared/tables/ResponsiveTableFrame";
import { Input } from "@/shared/ui/Input";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { TablePagination } from "@/shared/ui/TablePagination";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

type Props = { userId: number };

const PAGE_SIZE = 20;

/** Tek bir değişiklik değerini renk koduyla gösterir (yokluk → soluk "—"). */
function ChangeValue({
  value,
  emptyLabel,
  tone,
}: {
  value: string | null;
  emptyLabel: string;
  tone: "old" | "new" | "plain";
}) {
  if (value === null)
    return <span className="text-zinc-400">{emptyLabel}</span>;
  const cls =
    tone === "old"
      ? "text-red-700 line-through decoration-red-300"
      : tone === "new"
        ? "text-emerald-700"
        : "text-zinc-800";
  return <span className={`break-words ${cls}`}>{value}</span>;
}

/** Açılır detay: bir audit satırının alan-bazlı değişiklikleri. */
function AuditDetailPanel({
  item,
  t,
}: {
  item: AuditActivityItem;
  t: (key: string) => string;
}) {
  const kind = auditActionKind(item.action);
  const changes = buildAuditChanges(item, t);
  const hasSnapshot = item.oldData != null || item.newData != null;
  const emptyValue = t("audit.detail.emptyValue");

  const target = auditRecordTarget(item);
  const branchOverlay = useBranchDetailOverlay();
  const personnelOverlay = usePersonnelDetailOverlay();
  const warehouseOverlay = useWarehouseDetailOverlay();
  const contractorOverlay = useContractorDetailOverlay();

  // Şube/personel/depo detayları AppShell'de global overlay → sayfaya gitmeden
  // yerinde açılır. Diğerleri ilgili sayfaya navigasyon (Link).
  const openOverlay = () => {
    if (!target) return;
    switch (target.kind) {
      case "branch":
        branchOverlay.openBranchDetail(target.branchId, {
          initialTab: target.tab as BranchDetailTabId | null,
          focusTransactionId: target.focusTransactionId,
        });
        break;
      case "personnel":
        personnelOverlay.openPersonnelDetail(target.personnelId, {
          initialTab: target.tab as PersonnelDetailTabId | null,
          focusAdvanceId: target.focusAdvanceId,
        });
        break;
      case "warehouse":
        warehouseOverlay.openWarehouseDetail(target.warehouseId, {
          initialTab: target.openMovementId != null ? "history" : null,
          openMovementId: target.openMovementId,
        });
        break;
      case "contractor":
        contractorOverlay.openContractorDetail(target.contractorId);
        break;
    }
  };

  const linkClass =
    "mt-3 inline-flex min-h-9 items-center text-sm font-medium text-violet-700 hover:text-violet-800 hover:underline";
  const recordLink =
    target == null ? null : target.kind === "href" ? (
      <Link
        href={target.href}
        onClick={(e) => e.stopPropagation()}
        className={linkClass}
      >
        {t("audit.detail.goToRecord")}
      </Link>
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openOverlay();
        }}
        className={linkClass}
      >
        {t("audit.detail.openRecord")}
      </button>
    );

  if (!hasSnapshot)
    return (
      <div>
        <p className="text-sm text-zinc-500">{t("audit.detail.empty")}</p>
        {recordLink}
      </div>
    );
  if (changes.length === 0)
    return (
      <div>
        <p className="text-sm text-zinc-500">{t("audit.detail.none")}</p>
        {recordLink}
      </div>
    );

  const titleKey =
    kind === "create"
      ? "audit.detail.createdTitle"
      : kind === "delete"
        ? "audit.detail.deletedTitle"
        : "audit.detail.title";
  const isUpdate = kind === "update" || kind === "other";

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t(titleKey)}
      </p>
      <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-zinc-50/60">
        {changes.map((c) => (
          <div
            key={c.field}
            className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-3"
          >
            <dt className="text-xs font-medium text-zinc-600 sm:text-sm">
              {c.label}
            </dt>
            <dd className="min-w-0 text-sm">
              {isUpdate ? (
                <span className="flex flex-wrap items-baseline gap-1.5">
                  <ChangeValue
                    value={c.oldValue}
                    emptyLabel={emptyValue}
                    tone="old"
                  />
                  <span className="text-zinc-400">{t("audit.detail.arrow")}</span>
                  <ChangeValue
                    value={c.newValue}
                    emptyLabel={emptyValue}
                    tone="new"
                  />
                </span>
              ) : (
                <ChangeValue
                  value={kind === "delete" ? c.oldValue : c.newValue}
                  emptyLabel={emptyValue}
                  tone="plain"
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
      {recordLink}
    </div>
  );
}

export function UserAuditScreen({ userId }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const isAdminUser = hasPermissionCode(user, PERM.systemAdmin);

  const [action, setAction] = useState("");
  const [tableName, setTableName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpanded = (id: number) =>
    setExpandedId((cur) => (cur === id ? null : id));

  useEffect(() => {
    if (isReady && user && !isAdminUser) router.replace("/personnel");
  }, [isReady, user, isAdminUser, router]);

  // Kullanıcı adını çözmek için liste (admin sayfasından gelindiğinde önbellekten gelir).
  const { data: users = [] } = useUsersList(Boolean(isReady && isAdminUser));
  const target = useMemo(
    () => users.find((u) => u.id === userId),
    [users, userId],
  );
  const displayName =
    target?.fullName?.trim() ||
    target?.username ||
    t("audit.unknownUser").replace("{id}", String(userId));

  const { data, isPending, isError } = useUserAudit(
    {
      userId,
      action: action || undefined,
      tableName: tableName || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
    Boolean(isReady && isAdminUser),
  );

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasActiveFilter = Boolean(action || tableName || dateFrom || dateTo);

  const actionOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("audit.allActions") },
      { value: "INSERT", label: t("audit.action.create") },
      { value: "UPDATE", label: t("audit.action.update") },
      { value: "DELETE", label: t("audit.action.delete") },
    ],
    [t],
  );

  const entityOptions: SelectOption[] = useMemo(() => {
    const opts = AUDIT_ENTITY_TABLES.map((tn) => ({
      value: tn,
      label: auditEntityLabel(t, tn),
    })).sort((a, b) => a.label.localeCompare(b.label, locale));
    return [{ value: "", label: t("audit.allEntities") }, ...opts];
  }, [t, locale]);

  const resetFilters = () => {
    setAction("");
    setTableName("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <PageScreenScaffold
      top={
        <Link
          href="/admin/users"
          className="inline-flex min-h-11 items-center text-sm font-medium text-violet-700 hover:text-violet-800"
        >
          {t("audit.backToUsers")}
        </Link>
      }
      intro={
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
            {t("audit.pageTitle")}
          </h1>
          <p className="mt-1 truncate text-base font-semibold text-violet-700">
            {displayName}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {t("audit.pageDescriptionPrefix")}
          </p>
        </div>
      }
      mainSectionAriaLabel={t("audit.pageTitle")}
      main={
        <div className="flex flex-col gap-4">
          {/* Filtreler */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                name="action"
                label={t("audit.actionLabel")}
                value={action}
                options={actionOptions}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                onBlur={() => {}}
              />
              <Select
                name="tableName"
                label={t("audit.entityLabel")}
                value={tableName}
                options={entityOptions}
                onChange={(e) => {
                  setTableName(e.target.value);
                  setPage(1);
                }}
                onBlur={() => {}}
              />
              <Input
                name="dateFrom"
                type="date"
                label={t("audit.dateFromLabel")}
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
              <Input
                name="dateTo"
                type="date"
                label={t("audit.dateToLabel")}
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {hasActiveFilter ? (
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
                >
                  {t("audit.clearFilters")}
                </button>
              </div>
            ) : null}
          </div>

          {/* Durumlar */}
          {isPending ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
              {t("audit.loading")}
            </p>
          ) : isError ? (
            <p className="rounded-xl border border-dashed border-red-300 bg-red-50/60 p-6 text-center text-sm text-red-700">
              {t("audit.loadError")}
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
              {hasActiveFilter ? t("audit.emptyFiltered") : t("audit.empty")}
            </p>
          ) : (
            <>
              <ResponsiveTableFrame
                mobile={
                  <ul className="flex flex-col gap-3">
                    {items.map((it) => {
                      const d = describeAudit(it, t);
                      const isOpen = expandedId === it.id;
                      return (
                        <li
                          key={it.id}
                          className="rounded-xl border border-zinc-200 bg-white shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpanded(it.id)}
                            aria-expanded={isOpen}
                            className="flex w-full flex-col gap-2 p-3 text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-zinc-900">
                                {d.title}
                              </p>
                              <StatusBadge
                                tone={d.tone}
                                size="sm"
                                className="shrink-0 normal-case tracking-normal"
                              >
                                {d.actionLabel}
                              </StatusBadge>
                            </div>
                            <div className="grid gap-1 text-xs text-zinc-600">
                              <div className="flex justify-between gap-2">
                                <span className="text-zinc-500">{t("audit.colTime")}</span>
                                <span className="text-right tabular-nums text-zinc-700">
                                  {formatLocaleDateTime(it.createdAt, locale)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-zinc-500">{t("audit.colRecord")}</span>
                                <span className="min-w-0 truncate text-right text-zinc-700">
                                  {d.entityLabel}
                                  {it.recordPk
                                    ? ` · ${t("audit.recordIdPrefix")}${it.recordPk}`
                                    : ""}
                                </span>
                              </div>
                              {it.ipAddress ? (
                                <div className="flex justify-between gap-2">
                                  <span className="text-zinc-500">{t("audit.colIp")}</span>
                                  <span className="text-right tabular-nums text-zinc-600">
                                    {it.ipAddress}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                            <span className="mt-0.5 flex items-center justify-center gap-1 text-xs font-medium text-violet-700">
                              {isOpen ? t("audit.detail.hide") : t("audit.detail.show")}
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                aria-hidden
                              />
                            </span>
                          </button>
                          {isOpen ? (
                            <div className="border-t border-zinc-100 p-3">
                              <AuditDetailPanel item={it} t={t} />
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                }
                desktop={
                  <table className="w-full min-w-0 border-collapse text-left text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3 font-medium">
                          {t("audit.colTime")}
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 font-medium">
                          {t("audit.colAction")}
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 font-medium">
                          {t("audit.colWhat")}
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 font-medium">
                          {t("audit.colRecord")}
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 font-medium">
                          {t("audit.colIp")}
                        </th>
                        <th className="w-10 px-2 py-3">
                          <span className="sr-only">{t("audit.detail.show")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white">
                      {items.map((it) => {
                        const d = describeAudit(it, t);
                        const isOpen = expandedId === it.id;
                        return (
                          <Fragment key={it.id}>
                            <tr
                              onClick={() => toggleExpanded(it.id)}
                              aria-expanded={isOpen}
                              className="cursor-pointer hover:bg-zinc-50/80"
                            >
                              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-600">
                                {formatLocaleDateTime(it.createdAt, locale)}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge
                                  tone={d.tone}
                                  size="sm"
                                  className="normal-case tracking-normal"
                                >
                                  {d.actionLabel}
                                </StatusBadge>
                              </td>
                              <td className="px-4 py-3 font-medium text-zinc-900">
                                {d.title}
                              </td>
                              <td className="px-4 py-3 text-zinc-600">
                                {d.entityLabel}
                                {it.recordPk ? (
                                  <span className="text-zinc-400">
                                    {" · "}
                                    {t("audit.recordIdPrefix")}
                                    {it.recordPk}
                                  </span>
                                ) : null}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-500">
                                {it.ipAddress ?? "—"}
                              </td>
                              <td className="px-2 py-3 text-right">
                                <ChevronDown
                                  className={`inline-block h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                  aria-hidden
                                />
                              </td>
                            </tr>
                            {isOpen ? (
                              <tr className="bg-zinc-50/40">
                                <td colSpan={6} className="px-4 pb-4 pt-1">
                                  <AuditDetailPanel item={it} t={t} />
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                }
              />

              <TablePagination
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={totalCount}
                onPageChange={(p) => {
                  setPage(p);
                  setExpandedId(null);
                }}
                disabled={isPending}
              />
            </>
          )}
        </div>
      }
    />
  );
}
