"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import { PERM, hasEffectivePermission, hasPermissionCode } from "@/lib/auth/permissions";
import { useShipmentList, useRegenerateDeliverySlip } from "@/modules/shipments/hooks/useShipmentQueries";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Input } from "@/shared/ui/Input";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Skeleton, SkeletonText } from "@/shared/ui/Skeleton";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { ShipmentNextActorRole, ShipmentStatus } from "@/types/shipment";

const SHIPMENT_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "PREPARING",
  "ON_THE_WAY",
  "ARRIVED",
  "DELIVERED",
  "CANCELLED",
] as const satisfies readonly ShipmentStatus[];

const STATUS_TONE: Record<ShipmentStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 ring-amber-200",
  REVISION_REQUESTED: "bg-orange-100 text-orange-900 ring-orange-300",
  PREPARING: "bg-sky-100 text-sky-800 ring-sky-200",
  ON_THE_WAY: "bg-violet-100 text-violet-800 ring-violet-200",
  ARRIVED: "bg-teal-100 text-teal-800 ring-teal-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 ring-rose-200",
};

function replaceVars(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

/**
 * Liste satırında DELIVERED sevkiyatlar için admin'e açık "PDF oluştur" düğmesi.
 * Satır bir <Link> içinde olduğundan tıklama detaya yönlenmesin diye event'i senkron durdurur.
 * Kendi mutation örneğini tutar → her satırın busy durumu bağımsız.
 */
function RegenerateSlipButton({ id, t }: { id: number; t: (k: string) => string }) {
  const regenerate = useRegenerateDeliverySlip();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (regenerate.isPending) return;
        regenerate.mutate(id, {
          onSuccess: () => notify.success(t("shipments.detail.deliverySlipRegenerateSuccess")),
          onError: (err) => notify.error(toErrorMessage(err)),
        });
      }}
      disabled={regenerate.isPending}
      title={t("shipments.list.regeneratePdfHint")}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-white px-2 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-300 transition hover:bg-emerald-50 disabled:opacity-60"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 4v6h6M20 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 9a8 8 0 0 0-14.9-3M4 15a8 8 0 0 0 14.9 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {regenerate.isPending
        ? t("shipments.detail.deliverySlipRegenerating")
        : t("shipments.list.regeneratePdf")}
    </button>
  );
}

export function ShipmentListScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<ShipmentStatus | "">("");
  const [branchId, setBranchId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: branches = [] } = useBranchesList();
  const { data: warehouses = [] } = useWarehousesList();
  const { data, isPending } = useShipmentList({
    status,
    branchId: branchId ? Number(branchId) : undefined,
    warehouseId: warehouseId ? Number(warehouseId) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: 1,
    pageSize: 20,
  });

  const statusOptions = useMemo(
    (): SelectOption[] => [
      { value: "", label: t("shipments.list.statusAll") },
      ...SHIPMENT_STATUSES.map((value) => ({
        value,
        label: t(`shipments.status.${value}`),
      })),
    ],
    [t]
  );
  const branchOptions = useMemo(
    (): SelectOption[] => [
      { value: "", label: t("shipments.list.branchAll") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );
  const warehouseOptions = useMemo(
    (): SelectOption[] => [
      { value: "", label: t("shipments.list.warehouseAll") },
      ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [warehouses, t]
  );

  // Backend `CreateDraftAsync` [RequiresPermission(shipment.create)] ister. PermissionGrantResolver
  // ile birebir: system.admin joker kapsar, operations.staff YALNIZ ui.* kodlarını kapsar (shipment.create
  // değil). `hasEffectivePermission` aynı semantiği uygular — operations.staff'a yanlış buton göstermeyiz.
  const canCreateDraft = hasEffectivePermission(user, PERM.shipmentCreate);
  // Teslim irsaliyesini anlık oluştur (eski/eksik PDF'ler) — yalnız sistem yöneticisi (backend: system.admin).
  const canRegenerateSlip = hasPermissionCode(user, PERM.systemAdmin);

  const hasActiveFilter =
    status || branchId || warehouseId || dateFrom || dateTo;

  const resetFilters = () => {
    setStatus("");
    setBranchId("");
    setWarehouseId("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("shipments.list.eyebrow")}
          </p>
          <h1 className="text-xl font-semibold text-zinc-950">{t("shipments.list.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-600">{t("shipments.list.subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {hasPermissionCode(user, PERM.systemAdmin) ? (
            <Link href="/shipments/assignments" className="w-full sm:w-auto">
              <Button type="button" variant="secondary" className="w-full sm:w-auto">
                {t("shipments.list.assignments")}
              </Button>
            </Link>
          ) : null}
          {canCreateDraft ? (
            <Link href="/shipments/create" className="w-full sm:w-auto">
              <Button
                type="button"
                className="w-full gap-2 shadow-sm transition-shadow hover:shadow-md sm:w-auto"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                <span>{t("shipments.list.createRequest")}</span>
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-950">
        <strong>{t("shipments.list.requestOnlyTitle")}</strong> {t("shipments.list.requestOnlyHint")}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            name="status"
            label={t("shipments.list.statusLabel")}
            value={status}
            options={statusOptions}
            onChange={(e) => setStatus(e.target.value as ShipmentStatus | "")}
            onBlur={() => undefined}
          />
          <Select
            name="branch"
            label={t("shipments.list.branchLabel")}
            value={branchId}
            options={branchOptions}
            onChange={(e) => setBranchId(e.target.value)}
            onBlur={() => undefined}
          />
          <Select
            name="warehouse"
            label={t("shipments.list.warehouseLabel")}
            value={warehouseId}
            options={warehouseOptions}
            onChange={(e) => setWarehouseId(e.target.value)}
            onBlur={() => undefined}
          />
          <Input
            name="dateFrom"
            type="date"
            label={t("shipments.list.dateFromLabel")}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            name="dateTo"
            type="date"
            label={t("shipments.list.dateToLabel")}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {hasActiveFilter ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
            >
              {t("shipments.list.clearFilters")}
            </button>
          </div>
        ) : null}
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-100 p-3">
              <Skeleton className="mb-2 h-4 w-1/3" />
              <SkeletonText lines={1} />
            </div>
          ))}
        </div>
      ) : null}
      {!isPending && (data?.items ?? []).length === 0 ? (
        <EmptyState
          icon="📦"
          title={t("shipments.list.noItems")}
          description="Henüz sevkiyat kaydı yok. Yeni bir sevkiyat oluştur veya filtreleri kontrol et."
          compact
        />
      ) : null}

      <div className="grid gap-3">
        {(data?.items ?? []).map((x) => {
          const role = x.nextActorRole as ShipmentNextActorRole | null;
          const roleLabel = role ? t(`shipments.roles.${role}`) : null;
          const pendingText =
            roleLabel != null
              ? x.nextActorFullName
                ? replaceVars(t("shipments.list.nextActorPending"), {
                    role: roleLabel,
                    name: x.nextActorFullName,
                  })
                : replaceVars(t("shipments.list.nextActorPendingNoName"), { role: roleLabel })
              : null;
          const branchName = (x.branchName || "").trim() || `#${x.branchId}`;
          const warehouseName = (x.warehouseName || "").trim() || `#${x.warehouseId}`;
          const requestDate = x.requestedDeliveryDate
            ? new Date(x.requestedDeliveryDate).toLocaleDateString()
            : null;
          return (
            <Link
              key={x.id}
              href={`/shipments/${x.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-zinc-300 hover:shadow-sm sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950">{x.shipmentNo}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01" />
                      </svg>
                      <span className="truncate max-w-[10rem]">{branchName}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-100">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
                      </svg>
                      <span className="truncate max-w-[10rem]">{warehouseName}</span>
                    </span>
                    {requestDate ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path d="M3 9h18M8 3v4M16 3v4" />
                        </svg>
                        {requestDate}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_TONE[x.status]}`}
                  >
                    {t(`shipments.status.${x.status}`)}
                  </span>
                  {canRegenerateSlip && x.status === "DELIVERED" ? (
                    <RegenerateSlipButton id={x.id} t={t} />
                  ) : null}
                </div>
              </div>
              {pendingText ? (
                <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-zinc-700">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {pendingText}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
