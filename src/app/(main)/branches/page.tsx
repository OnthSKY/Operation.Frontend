import { BranchScreen } from "@/modules/branch/components/BranchScreen";
import { Suspense } from "react";

export default function BranchesPage() {
  return (
    <Suspense fallback={null}>
      <BranchScreen />
    </Suspense>
  );
}
