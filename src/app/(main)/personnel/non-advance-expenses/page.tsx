import { redirect } from "next/navigation";

export default function NonAdvancePersonnelExpensesPage() {
  redirect("/personnel/costs?tab=expenses");
}
