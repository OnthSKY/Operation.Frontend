import type { QuickActionsMenuSection } from "@/modules/branch/components/BranchQuickActionsMenu";

export type VehicleRowMenuMode = "full" | "extras";

export type BuildVehicleRowMenuParams = {
  canEdit: boolean;
  t: (key: string) => string;
  onView: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onAddMaintenance: () => void;
  onEditKm: () => void;
  onChangeAssignment?: () => void;
  onAddExpense?: () => void;
  onAddInsurance?: () => void;
  /** `extras`: dar ekranlarda görüntüle/düzenle butonları menü dışında olduğunda. */
  menuMode?: VehicleRowMenuMode;
};

/**
 * Araç satırı için hızlı eylem menüsü oluşturur. Mode'a göre içerik değişir:
 *  - `full`: detay aç, düzenle, sil, bakım ekle, km düzelt
 *  - `extras`: atama değiştir, gider ekle, sigorta ekle, sil, bakım ekle, km düzelt
 */
export function buildVehicleRowMenuSections({
  canEdit,
  t,
  onView,
  onEdit,
  onDelete,
  onAddMaintenance,
  onEditKm,
  onChangeAssignment,
  onAddExpense,
  onAddInsurance,
  menuMode = "full",
}: BuildVehicleRowMenuParams): QuickActionsMenuSection[] {
  const items: QuickActionsMenuSection["items"] = [];
  if (menuMode === "full") {
    items.push({ id: "view", label: t("common.openDetails"), onSelect: onView });
    if (canEdit) {
      items.push(
        { id: "edit", label: t("common.edit"), onSelect: onEdit },
        ...(onDelete
          ? [{ id: "delete", label: t("vehicles.deleteVehicle"), onSelect: onDelete }]
          : []),
        { id: "maint", label: t("vehicles.rowAddMaintenance"), onSelect: onAddMaintenance },
        { id: "km", label: t("vehicles.rowEditOdometer"), onSelect: onEditKm },
      );
    }
  } else if (canEdit) {
    if (onChangeAssignment) {
      items.push({
        id: "assign",
        label: t("vehicles.changeAssignment"),
        onSelect: onChangeAssignment,
      });
    }
    if (onAddExpense) {
      items.push({
        id: "expense",
        label: t("vehicles.addExpense"),
        onSelect: onAddExpense,
      });
    }
    if (onAddInsurance) {
      items.push({
        id: "insurance",
        label: t("vehicles.addInsurance"),
        onSelect: onAddInsurance,
      });
    }
    if (onDelete) {
      items.push({
        id: "delete",
        label: t("vehicles.deleteVehicle"),
        onSelect: onDelete,
      });
    }
    items.push(
      { id: "maint", label: t("vehicles.rowAddMaintenance"), onSelect: onAddMaintenance },
      { id: "km", label: t("vehicles.rowEditOdometer"), onSelect: onEditKm },
    );
  }
  if (items.length === 0) return [];
  const storyTitle =
    menuMode === "extras"
      ? t("vehicles.rowMenuExtras")
      : t("vehicles.rowMenuStory");
  return [{ storyTitle, items }];
}
