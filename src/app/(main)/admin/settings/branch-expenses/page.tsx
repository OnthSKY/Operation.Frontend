import { ExpenseDefinitionsScreen } from "@/modules/admin/components/ExpenseDefinitionsScreen";

export default function AdminBranchExpensesPage() {
  return (
    <ExpenseDefinitionsScreen
      group="BRANCH"
      variant="cost-sections"
      titleKey="settings.branchExpenseDefsPageTitle"
      descriptionKey="settings.branchExpenseDefsPageDescription"
    />
  );
}
