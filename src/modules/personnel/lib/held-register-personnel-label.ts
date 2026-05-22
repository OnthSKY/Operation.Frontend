import type { Personnel } from "@/types/personnel";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";

export function personnelLabelFromMap(
  personnelId: number | null | undefined,
  fullName: string | null | undefined,
  personnelById: Map<number, Personnel>,
  dash: string
): string {
  if (personnelId != null && personnelId > 0) {
    const p = personnelById.get(personnelId);
    if (p) return personnelDisplayName(p);
    const n = fullName?.trim();
    if (n) return n;
    return `#${personnelId}`;
  }
  return fullName?.trim() || dash;
}
