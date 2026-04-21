import { redirect } from "next/navigation";

/** Eski yer imleri: sayfa Ürünler altına taşındı. */
export default function LegacyReportsOrderAccountStatementRedirect() {
  redirect("/products/order-account-statement");
}
