"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { PERM, hasPermissionCode } from "@/lib/auth/permissions";
import { useShipmentList } from "@/modules/shipments/hooks/useShipmentQueries";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
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

function isShipmentStatus(value: string): value is ShipmentStatus {
  return (SHIPMENT_STATUSES as readonly string[]).includes(value);
}

export function ShipmentListScreen() {
  const { user } = useAuth();
  const [statusInput, setStatusInput] = useState("");
  const normalizedStatus = statusInput.trim().toUpperCase();
  const status: ShipmentStatus | "" = isShipmentStatus(normalizedStatus)
    ? normalizedStatus
    : "";
  const { data, isPending } = useShipmentList({ status, page: 1, pageSize: 20 });

  const handleStatusChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStatusInput(e.target.value);
  };
  const canCreateDraft =
    hasPermissionCode(user, PERM.systemAdmin) ||
    hasPermissionCode(user, PERM.operationsStaff) ||
    hasPermissionCode(user, PERM.shipmentCreate);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Shipment List</h1>
        <div className="flex items-center gap-2">
          {user?.role === "ADMIN" ? (
            <Link href="/shipments/assignments">
              <Button type="button" variant="secondary">Assignments</Button>
            </Link>
          ) : null}
          {canCreateDraft ? (
            <Link href="/shipments/create">
              <Button type="button">Create</Button>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input name="status" placeholder="Status (e.g. PREPARING)" value={statusInput} onChange={handleStatusChange} />
      </div>
      {isPending ? <p className="text-sm text-zinc-500">Loading...</p> : null}
      <div className="grid gap-3">
        {(data?.items ?? []).map((x) => (
          <Link
            key={x.id}
            href={`/shipments/${x.id}`}
            className="rounded-lg border border-zinc-200 bg-white p-3 text-sm hover:bg-zinc-50"
          >
            <div className="flex items-center justify-between">
              <strong>{x.shipmentNo}</strong>
              <span className="rounded bg-zinc-100 px-2 py-1 text-xs">{x.status}</span>
            </div>
            <div className="mt-2 text-zinc-600">Branch #{x.branchId} · Warehouse #{x.warehouseId}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
