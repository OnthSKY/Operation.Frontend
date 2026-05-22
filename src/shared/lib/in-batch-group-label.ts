/** Mono label for batch / shipment ids; smaller type on narrow viewports, wraps long UUIDs. */
export const shipmentIdLabelClassName =
  "font-mono break-all text-[0.6rem] leading-snug tracking-tight text-zinc-600 sm:text-xs sm:tracking-normal";

/** API `inBatchGroupId`: same value = same multi-line warehouse stock-in or branch shipment batch. */
export function formatInBatchGroupCell(raw: string | null | undefined): {
  text: string;
  title?: string;
} {
  const s = raw?.trim();
  if (!s) return { text: "—" };
  return { text: s };
}

/** Grouping key for UI: shared batch UUID or one key per legacy solo movement. */
export function warehouseMovementShipmentGroupKey(
  inBatchGroupId: string | null | undefined,
  movementId: number,
): string {
  const s = inBatchGroupId?.trim();
  if (s) return s;
  return `movement:${movementId}`;
}

/**
 * Shipment / batch label: full batch UUID, or `#movementId` when the row has no batch id (legacy data).
 */
export function formatWarehouseShipmentDisplay(
  inBatchGroupId: string | null | undefined,
  movementId: number,
): { text: string; title?: string } {
  const s = inBatchGroupId?.trim();
  if (s) return { text: s };
  const idStr = String(movementId);
  return { text: `#${idStr}` };
}
