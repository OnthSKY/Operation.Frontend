import type { WarehousePeopleOption } from "@/types/warehouse";
import type { SelectOption } from "@/shared/ui/Select";

/** Depo hareketleri için personel seçenekleri (yalnızca personnelId > 0). */
export function mapWarehousePersonnelOptions(
  people: WarehousePeopleOption[]
): { value: string; label: string }[] {
  const byId = new Map<number, string>();
  for (const o of people) {
    const pid = Number(o.personnelId);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    const label = (o.displayName ?? "").trim() || `#${pid}`;
    if (!byId.has(pid)) byId.set(pid, label);
  }
  return [...byId.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }))
    .map(([id, label]) => ({ value: String(id), label }));
}

export function withWarehousePersonnelPickPlaceholder(
  options: { value: string; label: string }[],
  placeholder: string
): SelectOption[] {
  return [{ value: "", label: placeholder }, ...options];
}
