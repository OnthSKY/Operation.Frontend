/** API `inBatchGroupId`: same value = same multi-line warehouse stock-in or branch shipment batch. */
export function formatInBatchGroupCell(raw: string | null | undefined): {
  text: string;
  title?: string;
} {
  const s = raw?.trim();
  if (!s) return { text: "—" };
  return { text: `${s.slice(0, 8)}…`, title: s };
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
 * Shipment / batch label: short UUID, or `#movementId` when the row has no batch id (legacy data).
 */
export function formatWarehouseShipmentDisplay(
  inBatchGroupId: string | null | undefined,
  movementId: number,
): { text: string; title?: string } {
  const s = inBatchGroupId?.trim();
  if (s) return { text: `${s.slice(0, 8)}…`, title: s };
  const idStr = String(movementId);
  return { text: `#${idStr}`, title: idStr };
}
