import type { VehicleDocumentKind } from "@/types/vehicle-document";

/** Araç dokümanı türü → i18n label key seçenekleri. */
export const VEHICLE_DOCUMENT_KIND_OPTIONS: ReadonlyArray<{
  value: VehicleDocumentKind;
  labelKey: string;
}> = [
  { value: "REGISTRATION", labelKey: "vehicles.docKindRegistration" },
  { value: "INSPECTION", labelKey: "vehicles.docKindInspection" },
  { value: "INSURANCE_POLICY", labelKey: "vehicles.docKindInsurancePolicy" },
  { value: "OTHER", labelKey: "vehicles.docKindOther" },
];
