import type { BranchType } from "@/types/branch";

/**
 * Şube tipi → rozet sunumu. UI'da listede ve detay banner'ında kullanılır.
 * Renkler tailwind class olarak verilir (build-time literal — tree-shake friendly).
 */
export type BranchTypeBadge = {
  emoji: string;
  label: string;
  /** Tailwind class string (bg + text + ring). */
  className: string;
};

const REGISTRY: Record<BranchType, BranchTypeBadge> = {
  OWNED: {
    emoji: "🏠",
    label: "Öz",
    className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  },
  JOINT_VENTURE: {
    emoji: "🤝",
    label: "Ortak",
    className: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  },
  FRANCHISE: {
    emoji: "📦",
    label: "Franchise",
    className: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200",
  },
};

export function getBranchTypeBadge(type: BranchType | null | undefined): BranchTypeBadge {
  if (type && type in REGISTRY) return REGISTRY[type as BranchType];
  return REGISTRY.OWNED;
}
