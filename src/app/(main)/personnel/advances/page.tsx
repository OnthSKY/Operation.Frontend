import { redirect } from "next/navigation";

export default function AllAdvancesPage() {
  redirect("/personnel/costs?tab=advances");
}
