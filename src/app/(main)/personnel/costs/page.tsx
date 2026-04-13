import { PersonnelCostsScreen } from "@/modules/personnel/components/PersonnelCostsScreen";
import { Suspense } from "react";

export default function PersonnelCostsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-zinc-500">…</div>
      }
    >
      <PersonnelCostsScreen />
    </Suspense>
  );
}
