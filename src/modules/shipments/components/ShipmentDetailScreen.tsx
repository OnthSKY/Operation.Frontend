"use client";

import { useState } from "react";
import { useShipmentDetail, useTransitionShipment } from "@/modules/shipments/hooks/useShipmentQueries";
import { useAuth } from "@/lib/auth/AuthContext";
import { PERM, hasPermissionCode } from "@/lib/auth/permissions";
import { Button } from "@/shared/ui/Button";

const ACTIONS = ["PENDING_APPROVAL", "PREPARING", "ON_THE_WAY", "DELIVERED", "COMPLETED", "COMPLETED_WITH_ISSUE"] as const;

export function ShipmentDetailScreen({ id }: { id: number }) {
  const { user } = useAuth();
  const { data, isPending } = useShipmentDetail(id);
  const transition = useTransitionShipment();
  const [note, setNote] = useState("");
  const canStartShipment =
    hasPermissionCode(user, PERM.systemAdmin) ||
    hasPermissionCode(user, PERM.operationsStaff) ||
    hasPermissionCode(user, PERM.shipmentStart);

  if (isPending || !data) return <div className="p-4 text-sm text-zinc-500">Loading...</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h1 className="text-lg font-semibold">{data.shipmentNo}</h1>
        <p className="mt-1 text-sm text-zinc-600">Current status: {data.status}</p>
        <p className="text-sm text-zinc-600">Branch #{data.branchId} · Warehouse #{data.warehouseId}</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="font-semibold">Products</h2>
        <div className="mt-2 space-y-2">
          {data.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>Product #{item.productId}</span>
              <span>{item.requestedQuantity}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="font-semibold">Timeline</h2>
        <div className="mt-2 space-y-2">
          {data.timeline.map((h) => (
            <div key={h.id} className="border-l-2 border-zinc-300 pl-3 text-sm">
              <div className="font-medium">{h.toStatus}</div>
              <div className="text-zinc-500">{new Date(h.changedAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-2 rounded-xl border border-zinc-200 bg-white p-3">
        <input
          className="mb-2 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          placeholder="Action note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {ACTIONS.filter((next) => next !== "PENDING_APPROVAL" || canStartShipment).map((next) => (
            <Button
              key={next}
              type="button"
              variant="secondary"
              onClick={() => transition.mutate({ id, toStatus: next, note })}
            >
              {next}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
