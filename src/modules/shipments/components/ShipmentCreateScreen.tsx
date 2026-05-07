"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useCreateShipmentDraft,
  useShipmentCreatableBranches,
} from "@/modules/shipments/hooks/useShipmentQueries";
import { RichCombobox } from "@/shared/ui/RichCombobox";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

export function ShipmentCreateScreen() {
  const router = useRouter();
  const createDraft = useCreateShipmentDraft();
  const { data: creatableBranches = [], isPending: branchesPending } = useShipmentCreatableBranches();
  const [branchId, setBranchId] = useState("");
  const [warehouseId, setWarehouseId] = useState("1");
  const [productId, setProductId] = useState("1");
  const [quantity, setQuantity] = useState("1");

  const branchOptions = useMemo(
    () => creatableBranches.map((x) => ({ value: String(x.id), title: x.name })),
    [creatableBranches]
  );

  const effectiveBranchId =
    branchId || (creatableBranches.length > 0 ? String(creatableBranches[0].id) : "");

  return (
    <div className="space-y-3 p-4">
      <h1 className="text-xl font-semibold">Create Shipment</h1>
      {creatableBranches.length <= 1 ? (
        <Input
          name="branchName"
          label="Branch"
          value={creatableBranches[0]?.name ?? ""}
          readOnly
        />
      ) : (
        <RichCombobox
          value={effectiveBranchId}
          onChange={(next) => setBranchId(next)}
          options={branchOptions}
          placeholder="Select branch"
          searchPlaceholder="Search branch..."
          emptyText={branchesPending ? "Loading..." : "No branch found"}
          disabled={branchesPending}
        />
      )}
      <Input name="warehouseId" label="Warehouse ID" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
      <Input name="productId" label="Product ID" value={productId} onChange={(e) => setProductId(e.target.value)} />
      <Input name="quantity" label="Requested quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      <Button
        type="button"
        onClick={async () => {
          if (!effectiveBranchId) return;
          const created = await createDraft.mutateAsync({
            branchId: Number(effectiveBranchId),
            warehouseId: Number(warehouseId),
            priority: "NORMAL",
            items: [{ productId: Number(productId), requestedQuantity: Number(quantity) }],
          });
          router.push(`/shipments/${created.id}`);
        }}
        disabled={createDraft.isPending || !effectiveBranchId || branchesPending}
      >
        {createDraft.isPending ? "Saving..." : "Save Draft"}
      </Button>
    </div>
  );
}
