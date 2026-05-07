"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import { PERM, hasPermissionCode } from "@/lib/auth/permissions";
import { useShipmentList } from "@/modules/shipments/hooks/useShipmentQueries";
import { Button } from "@/shared/ui/Button";
import { Select, type SelectOption } from "@/shared/ui/Select";
import type { ShipmentStatus } from "@/types/shipment";

const SHIPMENT_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "WAITING_WAREHOUSE",
  "PREPARING",
  "READY_FOR_DISPATCH",
  "ON_THE_WAY",
  "DELIVERED",
  "COMPLETED",
  "COMPLETED_WITH_ISSUE",
  "CANCELLED",
] as const satisfies readonly ShipmentStatus[];

function replaceVars(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

export function ShipmentListScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<ShipmentStatus | "">("");
  const { data, isPending } = useShipmentList({ status, page: 1, pageSize: 20 });

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
  const canCreateDraft =
    hasPermissionCode(user, PERM.systemAdmin) ||
    hasPermissionCode(user, PERM.operationsStaff) ||
    hasPermissionCode(user, PERM.shipmentCreate);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("shipments.list.eyebrow")}
          </p>
          <h1 className="text-xl font-semibold text-zinc-950">{t("shipments.list.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-600">{t("shipments.list.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "ADMIN" ? (
            <Link href="/shipments/assignments">
              <Button type="button" variant="secondary">{t("shipments.list.assignments")}</Button>
            </Link>
          ) : null}
          {canCreateDraft ? (
            <Link href="/shipments/create">
              <Button type="button">{t("shipments.list.createRequest")}</Button>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-950">
        <strong>{t("shipments.list.requestOnlyTitle")}</strong> {t("shipments.list.requestOnlyHint")}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Select
          name="status"
          label={t("shipments.list.statusLabel")}
          value={status}
          options={statusOptions}
          onChange={(event) => setStatus(event.target.value as ShipmentStatus | "")}
          onBlur={() => undefined}
        />
      </div>
      {isPending ? <p className="text-sm text-zinc-500">{t("common.loading")}</p> : null}
      <div className="grid gap-3">
        {(data?.items ?? []).map((x) => (
          <Link
            key={x.id}
            href={`/shipments/${x.id}`}
            className="rounded-lg border border-zinc-200 bg-white p-3 text-sm hover:bg-zinc-50"
          >
            <div className="flex items-center justify-between">
              <strong>{x.shipmentNo}</strong>
              <span className="rounded bg-zinc-100 px-2 py-1 text-xs">
                {t(`shipments.status.${x.status}`)}
              </span>
            </div>
            <div className="mt-2 text-zinc-600">
              {replaceVars(t("shipments.list.routeSummary"), {
                branchId: x.branchId,
                warehouseId: x.warehouseId,
              })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
