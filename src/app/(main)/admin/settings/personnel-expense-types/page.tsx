import { ExpenseDefinitionsScreen } from "@/modules/admin/components/ExpenseDefinitionsScreen";

export default function AdminPersonnelExpenseTypesPage() {
  return (
    <ExpenseDefinitionsScreen
      group="PER"
      variant="flat"
      titleKey="settings.personnelExpenseDefsPageTitle"
      descriptionKey="settings.personnelExpenseDefsPageDescription"
    />
  );
}
