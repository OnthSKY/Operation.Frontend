"use client";

import { useMemo, useState } from "react";
import {
  useSaveShipmentBranchAssignment,
  useShipmentBranchAssignments,
} from "@/modules/shipments/hooks/useShipmentQueries";
import { Button } from "@/shared/ui/Button";

type DraftRow = {
  starterUserId: string;
  approverUserId: string;
  warehouseUserId: string;
  driverAssignerUserId: string;
  dispatcherUserId: string;
  completerUserId: string;
};

function toNullableId(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function ShipmentAssignmentsScreen() {
  const { data, isPending } = useShipmentBranchAssignments();
  const save = useSaveShipmentBranchAssignment();
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});

  const userOptions = useMemo(
    () =>
      (data?.users ?? []).map((u) => ({
        value: String(u.userId),
        label: `${u.fullName?.trim() || u.username} (${u.username})`,
      })),
    [data?.users]
  );

  if (isPending || !data) return <div className="p-4 text-sm text-zinc-500">Loading...</div>;

  const ensureDraft = (branchId: number): DraftRow => {
    const existing = drafts[branchId];
    if (existing) return existing;
    const row = data.assignments.find((x) => x.branchId === branchId);
    return {
      starterUserId: row?.starterUserId ? String(row.starterUserId) : "",
      approverUserId: row?.approverUserId ? String(row.approverUserId) : "",
      warehouseUserId: row?.warehouseUserId ? String(row.warehouseUserId) : "",
      driverAssignerUserId: row?.driverAssignerUserId ? String(row.driverAssignerUserId) : "",
      dispatcherUserId: row?.dispatcherUserId ? String(row.dispatcherUserId) : "",
      completerUserId: row?.completerUserId ? String(row.completerUserId) : "",
    };
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Shipment Actor Assignments</h1>
      <p className="text-sm text-zinc-600">
        Branch bazli atama yapin. Kaydederken eksik shipment permissionlari sistem tarafinda otomatik ALLOW olarak verilir.
      </p>
      <div className="space-y-3">
        {data.assignments.map((row) => {
          const draft = ensureDraft(row.branchId);
          const setField = (key: keyof DraftRow, value: string) => {
            setDrafts((prev) => ({ ...prev, [row.branchId]: { ...draft, [key]: value } }));
          };
          return (
            <div key={row.branchId} className="rounded-xl border border-zinc-200 bg-white p-3">
              <div className="mb-2 text-sm font-semibold text-zinc-900">{row.branchName}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ["starterUserId", "Starter"],
                  ["approverUserId", "Approver"],
                  ["warehouseUserId", "Warehouse"],
                  ["driverAssignerUserId", "Driver assigner"],
                  ["dispatcherUserId", "Dispatcher"],
                  ["completerUserId", "Completer"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="text-xs text-zinc-600">
                    {label}
                    <select
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                      value={draft[key]}
                      onChange={(e) => setField(key, e.target.value)}
                    >
                      <option value="">Not assigned</option>
                      {userOptions.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() =>
                    save.mutate({
                      branchId: row.branchId,
                      body: {
                        starterUserId: toNullableId(draft.starterUserId),
                        approverUserId: toNullableId(draft.approverUserId),
                        warehouseUserId: toNullableId(draft.warehouseUserId),
                        driverAssignerUserId: toNullableId(draft.driverAssignerUserId),
                        dispatcherUserId: toNullableId(draft.dispatcherUserId),
                        completerUserId: toNullableId(draft.completerUserId),
                      },
                    })
                  }
                  disabled={save.isPending}
                >
                  {save.isPending ? "Saving..." : "Save assignments"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
