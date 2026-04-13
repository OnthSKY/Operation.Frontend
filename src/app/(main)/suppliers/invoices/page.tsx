import { SupplierInvoicesScreen } from "@/modules/suppliers/components/SupplierInvoicesScreen";
import { Suspense } from "react";

export default function SupplierInvoicesPage() {
  return (
    <Suspense fallback={null}>
      <SupplierInvoicesScreen />
    </Suspense>
  );
}
